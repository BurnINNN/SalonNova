'use server'

import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay } from 'date-fns'
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
        status: 'SCHEDULED',
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
