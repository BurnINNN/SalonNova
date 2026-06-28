import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
import { sendAppointmentReminders } from '@/actions/whatsapp'
import { addDays, startOfDay, endOfDay } from 'date-fns'

// Vercel Cron va appeler cette route (GET) avec le header d'autorisation.
export async function GET(request: Request) {
  // Optionnel: vérifier authorization header
  /*
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  */

  try {
    const tomorrow = addDays(new Date(), 1)
    const dayStart = startOfDay(tomorrow)
    const dayEnd = endOfDay(tomorrow)

    // Find all scheduled appointments for tomorrow
    const appointments = await prisma.appointment.findMany({
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

    // Group by salon to possibly respect salon settings in the future
    const bySalon: Record<string, typeof appointments> = {}
    appointments.forEach(apt => {
      if (!bySalon[apt.salonId]) bySalon[apt.salonId] = []
      bySalon[apt.salonId].push(apt)
    })

    const allResults = []

    for (const [salonId, apts] of Object.entries(bySalon)) {
      // In a real app, we would check salon.settings.whatsappRemindersEnabled here
      const results = await sendAppointmentReminders(salonId, apts)
      allResults.push(...results)
    }

    return NextResponse.json({ success: true, processed: appointments.length, results: allResults })
  } catch (error) {
    console.error('CRON WhatsApp Error:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
