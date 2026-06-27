'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { ProductSchema, MovementSchema, ProductInput, MovementInput } from '@/lib/validations/stock'
import { calculateCUMP } from '@/lib/stock/utils'

// ── PRODUITS ───────────────────────────────────────────────────────────────

export async function createProduct(input: ProductInput) {
  const data = ProductSchema.parse(input)

  // Vérifier doublon (même nom + marque dans ce salon)
  const existing = await prisma.product.findFirst({
    where: {
      salonId: data.salonId,
      name: { equals: data.name, mode: 'insensitive' },
      brand: data.brand ?? null,
    },
  })
  if (existing) throw new Error(`"${data.name}" existe déjà dans ce salon.`)

  const product = await prisma.product.create({ data })

  // Si stock initial > 0, créer un mouvement ENTREE pour traçabilité
  if (data.currentStock > 0) {
    await prisma.stockMovement.create({
      data: {
        type:           'ENTREE',
        quantity:       data.currentStock,
        quantityBefore: 0,
        quantityAfter:  data.currentStock,
        unitCost:       data.purchasePrice,
        cumpBefore:     0,
        cumpAfter:      data.purchasePrice,
        reason:         'Stock initial à la création du produit',
        productId:      product.id,
        salonId:        data.salonId,
      },
    })
  }

  revalidatePath('/stock')
  return product
}

export async function updateProduct(
  id: string,
  input: Partial<Omit<ProductInput, 'salonId' | 'currentStock'>>
) {
  // currentStock ne peut PAS être modifié directement — uniquement via les mouvements
  const product = await prisma.product.update({
    where: { id },
    data: input,
  })
  revalidatePath('/stock')
  revalidatePath(`/stock/products/${id}`)
  return product
}

export async function archiveProduct(id: string) {
  // Vérifier qu'il n'est pas lié à des prestations actives
  const links = await prisma.serviceProduct.count({ where: { productId: id } })
  if (links > 0) {
    throw new Error(
      `Ce produit est utilisé dans ${links} prestation(s). Retirez-le d'abord des prestations.`
    )
  }
  const product = await prisma.product.update({
    where: { id },
    data: { isActive: false },
  })
  revalidatePath('/stock')
  return product
}

export async function restoreProduct(id: string) {
  const product = await prisma.product.update({
    where: { id },
    data: { isActive: true },
  })
  revalidatePath('/stock')
  return product
}

export async function getProducts(salonId: string, includeArchived = false) {
  return prisma.product.findMany({
    where: {
      salonId,
      ...(!includeArchived && { isActive: true }),
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })
}

export async function getProductWithMovements(id: string, salonId: string) {
  return prisma.product.findFirst({
    where: { id, salonId },
    include: {
      stockMovements: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          appointment: { include: { service: true } },
        },
      },
      serviceProducts: {
        include: { service: { select: { name: true } } },
      },
    },
  })
}

// ── MOUVEMENTS MANUELS ─────────────────────────────────────────────────────

export async function recordMovement(input: MovementInput) {
  const { productId, type, quantity, unitCost, reason, salonId } =
    MovementSchema.parse(input)

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) throw new Error('Produit introuvable.')

  // Calculer le nouveau stock
  const isSortie = type === 'SORTIE' || type === 'RETOUR'
  const newStock = isSortie
    ? product.currentStock - quantity
    : product.currentStock + quantity

  // Bloquer si stock négatif
  if (newStock < 0) {
    throw new Error(
      `Stock insuffisant. Stock actuel : ${product.currentStock} ${product.unit}. ` +
      `Sortie demandée : ${quantity} ${product.unit}.`
    )
  }

  // Recalcul CUMP (uniquement pour les entrées)
  let newCump = product.purchasePrice
  if (!isSortie && unitCost && unitCost > 0) {
    newCump = calculateCUMP(product.currentStock, product.purchasePrice, quantity, unitCost)
  }

  await prisma.$transaction([
    prisma.product.update({
      where: { id: productId },
      data: {
        currentStock:  newStock,
        purchasePrice: newCump,
      },
    }),
    prisma.stockMovement.create({
      data: {
        type,
        quantity,
        quantityBefore: product.currentStock,
        quantityAfter:  newStock,
        unitCost:       unitCost ?? product.purchasePrice,
        cumpBefore:     product.purchasePrice,
        cumpAfter:      newCump,
        reason,
        productId,
        salonId,
      },
    }),
  ])

  revalidatePath('/stock')
  revalidatePath(`/stock/products/${productId}`)
}

// ── CONSOMMATION AUTOMATIQUE (appelée par createAppointment) ───────────────

export async function autoDeductStockForAppointment(
  serviceId: string,
  appointmentId: string,
  salonId: string
) {
  const serviceProducts = await prisma.serviceProduct.findMany({
    where: { serviceId },
    include: { product: true },
  })

  for (const sp of serviceProducts) {
    const product = sp.product

    // Si stock insuffisant : on consomme ce qui reste (pas de blocage)
    const actualDeduction = Math.min(sp.quantity, product.currentStock)
    const finalStock = product.currentStock - actualDeduction

    await prisma.$transaction([
      prisma.product.update({
        where: { id: product.id },
        data: { currentStock: finalStock },
      }),
      prisma.stockMovement.create({
        data: {
          type:           'SORTIE',
          quantity:       actualDeduction,
          quantityBefore: product.currentStock,
          quantityAfter:  finalStock,
          unitCost:       product.purchasePrice,
          cumpBefore:     product.purchasePrice,
          cumpAfter:      product.purchasePrice,
          reason:         `Consommation automatique — prestation`,
          productId:      product.id,
          appointmentId,
          salonId,
        },
      }),
    ])
  }
}

// ── INVENTAIRE PHYSIQUE ────────────────────────────────────────────────────

export async function startInventorySession(salonId: string, startedById: string) {
  // Vérifier qu'il n'y a pas déjà un inventaire en cours
  const existing = await prisma.inventorySession.findFirst({
    where: { salonId, status: 'IN_PROGRESS' },
  })
  if (existing) {
    throw new Error(
      'Un inventaire est déjà en cours. Terminez-le avant d\'en démarrer un nouveau.'
    )
  }

  // Récupérer tous les produits actifs
  const products = await prisma.product.findMany({
    where: { salonId, isActive: true },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })

  const session = await prisma.inventorySession.create({
    data: {
      salonId,
      startedById,
      status: 'IN_PROGRESS',
      lines: {
        create: products.map(p => ({
          productId:   p.id,
          expectedQty: p.currentStock,
          countedQty:  null, // pas encore saisie
        })),
      },
    },
    include: {
      lines: { include: { product: true } },
    },
  })

  revalidatePath('/stock/inventory')
  return session
}

export async function updateInventoryLine(
  lineId: string,
  countedQty: number
) {
  if (countedQty < 0) throw new Error('La quantité ne peut pas être négative.')

  await prisma.inventorySessionLine.update({
    where: { id: lineId },
    data: { countedQty },
  })
}

export async function closeInventorySession(sessionId: string, salonId: string) {
  const session = await prisma.inventorySession.findUnique({
    where: { id: sessionId },
    include: { lines: { include: { product: true } } },
  })
  if (!session) throw new Error('Session introuvable.')
  if (session.status !== 'IN_PROGRESS') throw new Error('Cette session est déjà clôturée.')

  // Vérifier que toutes les lignes ont une quantité saisie
  const unsavedLines = session.lines.filter(l => l.countedQty === null)
  if (unsavedLines.length > 0) {
    throw new Error(
      `${unsavedLines.length} produit(s) n'ont pas encore été comptés. ` +
      `Saisissez 0 si le produit est absent.`
    )
  }

  await prisma.$transaction(async tx => {
    for (const line of session.lines) {
      const counted = line.countedQty!
      const expected = line.expectedQty
      const diff = counted - expected

      if (diff === 0) continue // pas de changement, pas de mouvement

      // Mettre à jour le stock et créer un mouvement INVENTAIRE
      await tx.product.update({
        where: { id: line.productId },
        data: { currentStock: counted },
      })

      await tx.stockMovement.create({
        data: {
          type:              'INVENTAIRE',
          quantity:          Math.abs(diff),
          quantityBefore:    expected,
          quantityAfter:     counted,
          cumpBefore:        line.product.purchasePrice,
          cumpAfter:         line.product.purchasePrice,
          reason:            `Inventaire physique — écart : ${diff > 0 ? '+' : ''}${diff}`,
          productId:         line.productId,
          inventorySessionId: sessionId,
          salonId,
        },
      })

      // Sauvegarder la différence sur la ligne
      await tx.inventorySessionLine.update({
        where: { id: line.id },
        data: { difference: diff },
      })
    }

    await tx.inventorySession.update({
      where: { id: sessionId },
      data: { status: 'CLOSED', closedAt: new Date() },
    })
  })

  revalidatePath('/stock')
  revalidatePath('/stock/inventory')
}

export async function cancelInventorySession(sessionId: string) {
  await prisma.inventorySession.update({
    where: { id: sessionId },
    data: { status: 'CANCELLED' },
  })
  revalidatePath('/stock/inventory')
}

// ── MÉTRIQUES STOCK ────────────────────────────────────────────────────────

export async function getStockDashboardMetrics(salonId: string) {
  const products = await prisma.product.findMany({
    where: { salonId, isActive: true },
  })

  const totalValue     = products.reduce((s, p) => s + p.currentStock * p.purchasePrice, 0)
  const productCount   = products.length
  const ruptureCount   = products.filter(p => p.currentStock <= 0).length
  const basCount       = products.filter(p => p.currentStock > 0 && p.currentStock <= p.minStock).length
  const okCount        = products.filter(p => p.currentStock > p.minStock).length

  const byCategory = products.reduce<Record<string, { count: number; value: number }>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = { count: 0, value: 0 }
    acc[p.category].count++
    acc[p.category].value += p.currentStock * p.purchasePrice
    return acc
  }, {})

  return { totalValue, productCount, ruptureCount, basCount, okCount, byCategory }
}

export async function getLowAndRuptureProducts(salonId: string) {
  const products = await prisma.product.findMany({
    where: { salonId, isActive: true },
    orderBy: { currentStock: 'asc' },
  })
  return {
    rupture: products.filter(p => p.currentStock <= 0),
    bas:     products.filter(p => p.currentStock > 0 && p.currentStock <= p.minStock),
  }
}

// ── LIEN PRESTATION ↔ PRODUITS ─────────────────────────────────────────────

export async function setServiceProducts(
  serviceId: string,
  products: Array<{ productId: string; quantity: number }>
) {
  await prisma.$transaction([
    prisma.serviceProduct.deleteMany({ where: { serviceId } }),
    ...(products.length > 0
      ? [prisma.serviceProduct.createMany({
          data: products.map(p => ({ serviceId, productId: p.productId, quantity: p.quantity })),
        })]
      : []),
  ])
  revalidatePath('/stock')
}
