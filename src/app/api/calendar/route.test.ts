import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { GET } from './route'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    employee: {
      findUnique: vi.fn(),
    },
    appointment: {
      findMany: vi.fn(),
    },
  },
}))

describe('iCalendar API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait retourner une erreur 400 si le token est manquant', async () => {
    const request = new Request('http://localhost:3000/api/calendar')
    const response = await GET(request)

    expect(response.status).toBe(400)
    const text = await response.text()
    expect(text).toContain('Jeton manquant')
  })

  it('devrait retourner une erreur 404 si l\'employé n\'est pas trouvé', async () => {
    vi.mocked(prisma.employee.findUnique).mockResolvedValue(null)

    const request = new Request('http://localhost:3000/api/calendar?token=invalid_token')
    const response = await GET(request)

    expect(response.status).toBe(404)
    const text = await response.text()
    expect(text).toContain('Employé non trouvé')
  })

  it('devrait retourner un fichier .ics valide avec le format iCalendar standard', async () => {
    const mockEmployee = {
      id: 'emp_123',
      name: 'Yassmine',
      calendarToken: 'valid_token',
      salon: {
        id: 'salon_1',
        name: 'Salon BeColor',
      },
    }

    const mockAppointments = [
      {
        id: 'apt_1',
        startTime: new Date('2026-07-04T10:00:00Z'),
        endTime: new Date('2026-07-04T11:00:00Z'),
        notes: 'Cheveux secs',
        client: {
          firstName: 'Sophie',
          lastName: 'L.',
          phone: '+212600000000',
        },
        service: {
          name: 'Coupe Homme',
          duration: 60,
        },
      },
    ]

    vi.mocked(prisma.employee.findUnique).mockResolvedValue(mockEmployee as any)
    vi.mocked(prisma.appointment.findMany).mockResolvedValue(mockAppointments as any)

    const request = new Request('http://localhost:3000/api/calendar?token=valid_token')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('text/calendar')
    expect(response.headers.get('Content-Disposition')).toContain('attachment')

    const icsContent = await response.text()
    expect(icsContent).toContain('BEGIN:VCALENDAR')
    expect(icsContent).toContain('VERSION:2.0')
    expect(icsContent).toContain('X-WR-CALNAME:Agenda - Yassmine')
    expect(icsContent).toContain('BEGIN:VEVENT')
    expect(icsContent).toContain('UID:apt_1@salonpro.com')
    expect(icsContent).toContain('DESCRIPTION:Prestation : Coupe Homme')
    expect(icsContent).toContain('Salon : Salon BeCol')
    expect(icsContent).toContain('END:VEVENT')
    expect(icsContent).toContain('END:VCALENDAR')
  })
})
