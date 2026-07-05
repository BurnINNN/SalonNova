'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { CreateTransactionSchema, type CreateTransactionInput } from '@/schemas/pos'

export async function createTransaction(input: CreateTransactionInput) {
  const data = CreateTransactionSchema.parse(input)

  // Calcul automatique de la monnaie (si non fourni explicitement)
  const changeGiven = data.changeGiven !== undefined
    ? data.changeGiven
    : (data.paymentMethod === 'CASH' ? Math.max(0, data.amountPaid - data.totalAmount) : 0)

  const transaction = await prisma.$transaction(async (tx) => {
    // Créer la transaction
    const t = await tx.transaction.create({
      data: {
        salonId: data.salonId,
        totalAmount: data.totalAmount,
        amountPaid: data.amountPaid,
        changeGiven,
        paymentMethod: data.paymentMethod,
        clientId: data.clientId,
        employeeId: data.employeeId,
        appointmentId: data.appointmentId,
        discount: data.discount,
        discountReason: data.discountReason,
        lines: {
          create: data.lines.map(line => ({
            label: line.label,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            totalPrice: line.totalPrice,
            serviceId: line.serviceId,
            productId: line.productId,
          }))
        }
      },
      include: { lines: true }
    })

    // Déduction du stock pour les produits
    for (const line of data.lines) {
      if (line.productId) {
        const product = await tx.product.findUnique({ where: { id: line.productId } })
        if (product) {
          const newStock = product.currentStock - line.quantity
          await tx.product.update({
            where: { id: product.id },
            data: { currentStock: newStock }
          })
          
          await tx.stockMovement.create({
            data: {
              type: 'SORTIE',
              quantity: line.quantity,
              quantityBefore: product.currentStock,
              quantityAfter: newStock,
              reason: 'Vente en caisse',
              productId: product.id,
              salonId: data.salonId,
              appointmentId: data.appointmentId,
            }
          })
        }
      }
    }

    return t
  })

  revalidatePath('/caisse')
  revalidatePath('/dashboard')
  return transaction
}

export async function cancelTransaction(id: string, reason: string) {
  if (!reason) throw new Error('Un motif d\'annulation est obligatoire')

  const transaction = await prisma.$transaction(async (tx) => {
    const t = await tx.transaction.update({
      where: { id },
      data: {
        cancelledAt: new Date(),
        cancelReason: reason
      },
      include: { lines: true }
    })

    // Restaurer le stock
    for (const line of t.lines) {
      if (line.productId) {
        const product = await tx.product.findUnique({ where: { id: line.productId } })
        if (product) {
          const newStock = product.currentStock + line.quantity
          await tx.product.update({
            where: { id: product.id },
            data: { currentStock: newStock }
          })
          
          await tx.stockMovement.create({
            data: {
              type: 'RETOUR',
              quantity: line.quantity,
              quantityBefore: product.currentStock,
              quantityAfter: newStock,
              reason: `Annulation transaction ${t.id} - ${reason}`,
              productId: product.id,
              salonId: t.salonId,
              appointmentId: t.appointmentId,
            }
          })
        }
      }
    }

    return t
  })

  revalidatePath('/caisse')
  revalidatePath('/dashboard')
  return transaction
}

export async function getDailyTransactions(salonId: string, dateStr?: string) {
  const date = dateStr ? new Date(dateStr) : new Date()
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
  const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)

  return prisma.transaction.findMany({
    where: {
      salonId,
      createdAt: { gte: startOfDay, lte: endOfDay }
    },
    include: {
      client: true,
      employee: true,
      lines: true
    },
    orderBy: { createdAt: 'desc' }
  })
}

export async function getDailySummary(salonId: string, dateStr?: string) {
  const transactions = await getDailyTransactions(salonId, dateStr)
  
  const activeTransactions = transactions.filter(t => !t.cancelledAt)
  
  const totalCash = activeTransactions
    .filter(t => t.paymentMethod === 'CASH')
    .reduce((sum, t) => sum + t.totalAmount, 0)
    
  const totalCard = activeTransactions
    .filter(t => t.paymentMethod === 'CARD')
    .reduce((sum, t) => sum + t.totalAmount, 0)
    
  const date = dateStr ? new Date(dateStr) : new Date()
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
  const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)

  // On déduit les charges payées en CASH de la caisse
  const indirectCashCharges = await prisma.indirectCharge.findMany({
    where: {
      salonId,
      date: { gte: startOfDay, lte: endOfDay },
      paymentMethod: 'CASH'
    }
  })
  const totalCashExpenses = indirectCashCharges.reduce((sum, c) => sum + c.amount, 0)
    
  const totalGlobal = totalCash + totalCard
  const count = activeTransactions.length
  
  return {
    totalCash: totalCash - totalCashExpenses,
    totalCard,
    totalGlobal,
    count,
    averageTicket: count > 0 ? totalGlobal / count : 0
  }
}

export async function openCashRegisterSession(salonId: string, openingBalance: number) {
  const session = await prisma.cashRegisterSession.create({
    data: {
      salonId,
      openingBalance
    }
  })
  revalidatePath('/caisse')
  return session
}

export async function closeCashRegisterSession(sessionId: string, physicalBalance: number) {
  const session = await prisma.cashRegisterSession.findUnique({
    where: { id: sessionId }
  })

  if (!session) throw new Error('Session introuvable')

  const summary = await getDailySummary(session.salonId, session.openedAt.toISOString())
  
  // Le closingBalance théorique : le fond de caisse initial + les paiements en espèces du jour
  const closingBalance = session.openingBalance + summary.totalCash
  const discrepancy = physicalBalance - closingBalance

  const closedSession = await prisma.cashRegisterSession.update({
    where: { id: sessionId },
    data: {
      closedAt: new Date(),
      closingBalance,
      physicalBalance,
      discrepancy
    }
  })

  revalidatePath('/caisse')
  return closedSession
}

export async function getActiveSession(salonId: string) {
  return prisma.cashRegisterSession.findFirst({
    where: {
      salonId,
      closedAt: null
    },
    orderBy: { openedAt: 'desc' }
  })
}
