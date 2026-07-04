'use server'

import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay, subDays } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const TIMEZONE = 'Africa/Casablanca'

export async function getDashboardMetrics(salonId: string, startDate?: Date, endDate?: Date) {
  const now = toZonedTime(new Date(), TIMEZONE)
  const dayStart = startDate || startOfDay(now)
  const dayEnd = endDate || endOfDay(now)

  const [transactions, todayAppointments, pendingCount, newClients] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        salonId,
        createdAt: { gte: dayStart, lte: dayEnd },
        cancelledAt: null
      }
    }),
    prisma.appointment.count({
      where: {
        salonId,
        startTime: { gte: dayStart, lte: dayEnd },
      },
    }),
    prisma.appointment.count({
      where: {
        salonId,
        startTime: { gte: dayStart, lte: dayEnd },
        status: { in: ['SCHEDULED', 'PENDING'] },
      },
    }),
    prisma.client.count({
      where: {
        salonId,
        createdAt: { gte: dayStart, lte: dayEnd }
      }
    })
  ])

  const dailyRevenue = transactions.reduce(
    (sum, t) => sum + t.totalAmount,
    0
  )

  const fillRate = todayAppointments > 0
    ? Math.round(((todayAppointments - pendingCount) / todayAppointments) * 100)
    : 0

  return {
    dailyRevenue,
    pendingCount,
    fillRate,
    completedCount: todayAppointments - pendingCount,
    newClientsCount: newClients,
    totalAppointments: todayAppointments
  }
}

export async function getUpcomingAppointments(salonId: string, limit: number = 5) {
  const now = toZonedTime(new Date(), TIMEZONE)
  const dayEnd = endOfDay(now)

  return prisma.appointment.findMany({
    where: {
      salonId,
      startTime: { gte: now, lte: dayEnd },
      status: { notIn: ['CANCELLED', 'NO_SHOW'] }
    },
    include: {
      client: true,
      service: true,
      employee: true
    },
    orderBy: { startTime: 'asc' },
    take: limit
  })
}

export async function getWeeklyRevenue(salonId: string) {
  const now = toZonedTime(new Date(), TIMEZONE)
  const sevenDaysAgo = subDays(now, 6)
  sevenDaysAgo.setHours(0, 0, 0, 0)
  
  const transactions = await prisma.transaction.findMany({
    where: {
      salonId,
      createdAt: { gte: sevenDaysAgo },
      cancelledAt: null
    },
    select: {
      totalAmount: true,
      createdAt: true
    }
  })
  
  const dataMap = new Map<string, number>()
  
  // Initialize map with last 7 days
  for (let i = 6; i >= 0; i--) {
    const d = subDays(now, i)
    const label = d.toLocaleDateString('fr-FR', { weekday: 'short' })
    const cleanLabel = label.charAt(0).toUpperCase() + label.slice(1, 3).replace('.', '')
    dataMap.set(cleanLabel, 0)
  }
  
  transactions.forEach(t => {
    const zonedCreated = toZonedTime(t.createdAt, TIMEZONE)
    const label = zonedCreated.toLocaleDateString('fr-FR', { weekday: 'short' })
    const cleanLabel = label.charAt(0).toUpperCase() + label.slice(1, 3).replace('.', '')
    if (dataMap.has(cleanLabel)) {
      dataMap.set(cleanLabel, dataMap.get(cleanLabel)! + t.totalAmount)
    }
  })
  
  return Array.from(dataMap.entries()).map(([day, revenue]) => ({
    day,
    revenue
  }))
}
