import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendAppointmentReminders, sendAppointment30MinReminders } from '@/actions/whatsapp'
import { addDays, startOfDay, endOfDay } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const now = new Date()
    const startTimeMin = new Date(now.getTime() + 20 * 60000)
    const startTimeMax = new Date(now.getTime() + 40 * 60000)

    // 1. Rappels 30 minutes avant (sécurisés par le drapeau reminderSent30Min)
    const urgentAppointments = await prisma.appointment.findMany({
      where: {
        startTime: { gte: startTimeMin, lte: startTimeMax },
        status: 'SCHEDULED',
        reminderSent30Min: false
      },
      include: {
        client: true,
        service: true,
        employee: true,
        salon: true
      }
    })

    const results30Min = await sendAppointment30MinReminders(urgentAppointments)

    // 2. Rappels J-1 pour demain (comportement d'origine)
    const tomorrow = addDays(new Date(), 1)
    const dayStart = startOfDay(tomorrow)
    const dayEnd = endOfDay(tomorrow)

    const tomorrowAppointments = await prisma.appointment.findMany({
      where: {
        startTime: { gte: dayStart, lte: dayEnd },
        status: 'SCHEDULED'
      },
      include: {
        client: true,
        service: true,
        employee: true,
        salon: true
      }
    })

    const bySalon: Record<string, typeof tomorrowAppointments> = {}
    tomorrowAppointments.forEach(apt => {
      if (!bySalon[apt.salonId]) bySalon[apt.salonId] = []
      bySalon[apt.salonId].push(apt)
    })

    const tomorrowResults = []
    for (const [salonId, apts] of Object.entries(bySalon)) {
      const results = await sendAppointmentReminders(salonId, apts)
      tomorrowResults.push(...results)
    }

    return NextResponse.json({
      success: true,
      processed30Min: urgentAppointments.length,
      results30Min,
      processedTomorrow: tomorrowAppointments.length,
      resultsTomorrow: tomorrowResults
    })
  } catch (error) {
    console.error('CRON WhatsApp Error:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}

