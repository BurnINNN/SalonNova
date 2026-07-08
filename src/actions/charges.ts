'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================================
// CATÉGORIES DE CHARGES
// ============================================================

const CreateChargeCategorySchema = z.object({
  salonId: z.string(),
  name: z.string().min(1, 'Le nom est obligatoire'),
  icon: z.string().optional(),
  color: z.string().optional(),
})

export async function createChargeCategory(input: z.infer<typeof CreateChargeCategorySchema>) {
  const data = CreateChargeCategorySchema.parse(input)
  const category = await prisma.chargeCategory.create({ data })
  revalidatePath('/settings')
  revalidatePath('/caisse')
  return category
}

export async function updateChargeCategory(
  id: string,
  input: { name?: string; icon?: string; color?: string }
) {
  const category = await prisma.chargeCategory.update({
    where: { id },
    data: input,
  })
  revalidatePath('/settings')
  revalidatePath('/caisse')
  return category
}

export async function deleteChargeCategory(id: string) {
  // Soft delete
  const category = await prisma.chargeCategory.update({
    where: { id },
    data: { isActive: false },
  })
  revalidatePath('/settings')
  revalidatePath('/caisse')
  return category
}

export async function getChargeCategories(salonId: string) {
  return prisma.chargeCategory.findMany({
    where: { salonId, isActive: true },
    orderBy: { createdAt: 'asc' },
  })
}

// ============================================================
// ENTRÉES DE CHARGES PAR PRESTATION
// ============================================================

const SaveServiceChargesSchema = z.object({
  transactionId: z.string(),
  salonId: z.string(),
  charges: z.array(z.object({
    categoryId: z.string(),
    amount: z.number().min(0),
    notes: z.string().optional(),
  })),
})

export async function saveServiceCharges(input: z.infer<typeof SaveServiceChargesSchema>) {
  const data = SaveServiceChargesSchema.parse(input)

  // Filtrer les charges avec montant > 0
  const validCharges = data.charges.filter(c => c.amount > 0)

  if (validCharges.length === 0) return []

  // Supprimer les anciennes entrées pour cette transaction (upsert)
  await prisma.serviceChargeEntry.deleteMany({
    where: { transactionId: data.transactionId },
  })

  // Créer les nouvelles entrées
  const entries = await prisma.$transaction(
    validCharges.map(charge =>
      prisma.serviceChargeEntry.create({
        data: {
          estimatedAmount: charge.amount,
          notes: charge.notes,
          categoryId: charge.categoryId,
          transactionId: data.transactionId,
          salonId: data.salonId,
        },
      })
    )
  )

  revalidatePath('/caisse')
  revalidatePath('/dashboard')
  return entries
}

export async function getServiceCharges(transactionId: string) {
  return prisma.serviceChargeEntry.findMany({
    where: { transactionId },
    include: { category: true },
    orderBy: { createdAt: 'asc' },
  })
}

// ============================================================
// AGRÉGATIONS & BILAN QUOTIDIEN
// ============================================================

export async function getDailyChargeBreakdown(salonId: string, dateStr?: string) {
  let date = new Date()
  if (dateStr) {
    // Si dateStr est au format ISO ou YYYY-MM-DD, on extrait les composants locaux
    const cleanDateStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr
    const parts = cleanDateStr.split('-')
    if (parts.length === 3) {
      // Année, Mois (0-indexed), Jour à midi pour éviter les décalages de fuseaux
      date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0)
    } else {
      date = new Date(dateStr)
    }
  }
  
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
  const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)

  // 1. CA du jour (transactions non annulées)
  const transactions = await prisma.transaction.findMany({
    where: {
      salonId,
      createdAt: { gte: startOfDay, lte: endOfDay },
      cancelledAt: null,
    },
    include: {
      lines: true,
      chargeEntries: { include: { category: true } },
    },
  })

  const ca = transactions.reduce((sum, t) => sum + t.amountPaid, 0)

  // 2. Charges directes (produits consommés — StockMovement SORTIE)
  const stockMovements = await prisma.stockMovement.findMany({
    where: {
      salonId,
      createdAt: { gte: startOfDay, lte: endOfDay },
      type: 'SORTIE',
    },
  })
  const directCharges = stockMovements.reduce(
    (sum, m) => sum + m.quantity * (m.cumpBefore || m.unitCost || 0),
    0
  )

  // 3. Charges opérationnelles (ServiceChargeEntry du jour)
  const allChargeEntries = transactions.flatMap(t => t.chargeEntries)
  const operationalCharges = allChargeEntries.reduce(
    (sum, e) => sum + e.estimatedAmount,
    0
  )

  // Breakdown par catégorie
  const byCategory: Record<string, { name: string; color: string | null; total: number }> = {}
  allChargeEntries.forEach(entry => {
    const key = entry.categoryId
    if (!byCategory[key]) {
      byCategory[key] = {
        name: entry.category.name,
        color: entry.category.color,
        total: 0,
      }
    }
    byCategory[key].total += entry.estimatedAmount
  })

  // 4. Charges indirectes (IndirectCharge du jour)
  const indirects = await prisma.indirectCharge.findMany({
    where: {
      salonId,
      date: { gte: startOfDay, lte: endOfDay },
    },
  })
  const indirectCharges = indirects.reduce((sum, c) => sum + c.amount, 0)

  // 5. Résultat net
  const netResult = ca - directCharges - operationalCharges - indirectCharges

  return {
    ca,
    directCharges,
    operationalCharges,
    indirectCharges,
    netResult,
    transactionCount: transactions.length,
    byCategory: Object.values(byCategory),
  }
}
