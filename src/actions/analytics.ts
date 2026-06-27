'use server'

import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth } from 'date-fns'

export async function getAnalytics(salonId: string, startDate?: Date, endDate?: Date) {
  const start = startDate || startOfMonth(new Date())
  const end = endDate || endOfMonth(new Date())

  // 1. Transactions CA
  const transactions = await prisma.transaction.findMany({
    where: {
      salonId,
      createdAt: { gte: start, lte: end },
      cancelledAt: null,
    },
    include: {
      lines: {
        include: { 
          service: { include: { category: true } }, 
          product: true 
        }
      },
      client: true
    }
  })

  const ca = transactions.reduce((sum, t) => sum + t.amountPaid, 0)

  // 2. Direct charges (Stock consumed during this period)
  const stockMovements = await prisma.stockMovement.findMany({
    where: {
      salonId,
      createdAt: { gte: start, lte: end },
      type: 'SORTIE',
    }
  })
  
  const directCharges = stockMovements.reduce((sum, m) => sum + (m.quantity * (m.cumpBefore || m.unitCost || 0)), 0)

  // 3. Indirect charges
  const indirects = await prisma.indirectCharge.findMany({
    where: {
      salonId,
      date: { gte: start, lte: end }
    }
  })
  const indirectCharges = indirects.reduce((sum, c) => sum + c.amount, 0)


  // Top 5 Services & Categories
  const serviceStats: Record<string, { name: string, volume: number, revenue: number }> = {}
  const categoryStats: Record<string, { name: string, volume: number, revenue: number }> = {}
  
  transactions.forEach(t => {
    t.lines.forEach(line => {
      if (line.serviceId && line.service) {
        // Stats par service
        if (!serviceStats[line.serviceId]) {
          serviceStats[line.serviceId] = { name: line.service.name, volume: 0, revenue: 0 }
        }
        serviceStats[line.serviceId].volume += line.quantity
        serviceStats[line.serviceId].revenue += line.totalPrice

        // Stats par catégorie
        const cat = line.service.category?.name || 'Général'
        if (!categoryStats[cat]) {
          categoryStats[cat] = { name: cat, volume: 0, revenue: 0 }
        }
        categoryStats[cat].volume += line.quantity
        categoryStats[cat].revenue += line.totalPrice
      }
    })
  })

  const topServices = Object.values(serviceStats)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  // Top 5 Clients
  const clientStats: Record<string, { name: string, visits: number, revenue: number }> = {}

  transactions.forEach(t => {
    if (t.client) {
      if (!clientStats[t.clientId!]) {
        clientStats[t.clientId!] = { name: `${t.client.firstName} ${t.client.lastName}`, visits: 0, revenue: 0 }
      }
      clientStats[t.clientId!].visits += 1
      clientStats[t.clientId!].revenue += t.amountPaid
    }
  })

  const topClients = Object.values(clientStats)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  // Salaries Fixed calculation for Bilan
  const employees = await prisma.employee.findMany({ where: { salonId } })
  const totalSalaries = employees.reduce((sum, e) => {
    return sum + (e.salaryType !== 'COMMISSION' ? (e.baseSalary || 0) : 0)
  }, 0)

  return {
    appointmentsCount: transactions.length,
    ca,
    directCharges,
    indirectCharges: indirectCharges + totalSalaries,
    totalSalaries,
    indirectsList: indirects,
    topServices,
    topClients,
    categoryStats: Object.values(categoryStats)
  }
}

export async function addIndirectCharge(data: { name: string, description?: string, amount: number, paymentMethod?: 'CASH' | 'CARD', date: Date, salonId: string }) {
  return prisma.indirectCharge.create({
    data: {
      ...data,
      paymentMethod: data.paymentMethod || null
    }
  })
}

export async function getMonthlyAnalytics(salonId: string, numMonths: number = 6) {
  const result = []
  for (let i = 0; i < numMonths; i++) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const sDate = startOfMonth(d)
    const eDate = endOfMonth(d)
    const data = await getAnalytics(salonId, sDate, eDate)
    result.push({
      month: d.toISOString(),
      data
    })
  }
  return result
}
