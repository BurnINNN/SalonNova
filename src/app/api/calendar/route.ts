import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Helper pour formater une date au format UTC compact iCalendar (YYYYMMDDTHHmmssZ)
function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

// Helper pour échapper les caractères spéciaux dans les champs texte iCalendar
function escapeICSField(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
}

// Helper pour découper les lignes de plus de 75 caractères (RFC 5545 Line Folding)
function foldLine(line: string): string {
  if (line.length <= 75) return line
  let result = line.substring(0, 75)
  let remaining = line.substring(75)
  while (remaining.length > 0) {
    result += '\r\n ' + remaining.substring(0, 74)
    remaining = remaining.substring(74)
  }
  return result
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return new Response('Jeton manquant (token parameter is required)', { status: 400 })
    }

    // Trouver l'employé associé au jeton et récupérer les infos du salon
    const employee = await prisma.employee.findUnique({
      where: { calendarToken: token },
      include: { salon: true }
    })

    if (!employee) {
      return new Response('Employé non trouvé ou jeton invalide', { status: 404 })
    }

    // Récupérer les rendez-vous du salon (non annulés) à partir des 30 derniers jours
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const appointments = await prisma.appointment.findMany({
      where: {
        salonId: employee.salonId,
        status: { not: 'CANCELLED' },
        startTime: { gte: thirtyDaysAgo }
      },
      include: {
        client: true,
        service: true,
        employee: true
      },
      orderBy: {
        startTime: 'asc'
      }
    })

    const nowStr = formatICSDate(new Date())

    const icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SalonPro//NONSGML Calendar//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${escapeICSField(`Agenda - ${employee.salon.name}`)}`,
      'X-WR-TIMEZONE:UTC'
    ]

    for (const apt of appointments) {
      const clientName = `${apt.client.firstName} ${apt.client.lastName}`
      
      const descriptionLines = [
        `Prestation : ${apt.service.name}`,
        `Coiffeur/se : ${apt.employee.name}`,
        `Durée : ${apt.service.duration} min`,
        `Client : ${clientName}`,
        apt.client.phone ? `Téléphone client : ${apt.client.phone}` : null,
        apt.notes ? `Notes : ${apt.notes}` : null,
        `Salon : ${employee.salon.name}`
      ].filter(Boolean) as string[]

      const summary = `[${apt.employee.name}] ${apt.service.name} - ${clientName}`
      const description = descriptionLines.join('\n')

      icsLines.push('BEGIN:VEVENT')
      icsLines.push(`UID:${apt.id}@salonpro.com`)
      icsLines.push(`DTSTAMP:${nowStr}`)
      icsLines.push(`DTSTART:${formatICSDate(apt.startTime)}`)
      icsLines.push(`DTEND:${formatICSDate(apt.endTime)}`)
      icsLines.push(`SUMMARY:${escapeICSField(summary)}`)
      icsLines.push(`DESCRIPTION:${escapeICSField(description)}`)
      icsLines.push('END:VEVENT')
    }

    icsLines.push('END:VCALENDAR')

    // Formater avec le pliage de lignes et retours chariots standard CRLF
    const icsContent = icsLines.map(foldLine).join('\r\n') + '\r\n'

    return new Response(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="calendar-${employee.id}.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })

  } catch (error) {
    console.error('[CALENDAR API] Error generating ICS feed:', error)
    return new Response('Erreur interne du serveur lors de la génération du calendrier', { status: 500 })
  }
}
