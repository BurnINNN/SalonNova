import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { AgendaClient } from '@/components/agenda/AgendaClient'

export default async function AgendaPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let employee = null
  let appointments: any[] = []
  let clients: any[] = []
  let employees: any[] = []
  let services: any[] = []
  let salonId = ''

  if (user) {
    employee = await prisma.employee.findUnique({
      where: { userId: user.id },
    })
    if (employee) {
      salonId = employee.salonId

      const [appts, clientList, employeeList, serviceList] = await Promise.all([
        prisma.appointment.findMany({
          where: { salonId: employee.salonId },
          include: { client: true, service: true, employee: true },
        }),
        prisma.client.findMany({
          where: { salonId: employee.salonId },
          orderBy: { lastName: 'asc' },
        }),
        prisma.employee.findMany({
          where: { salonId: employee.salonId },
        }),
        prisma.service.findMany({
          where: { salonId: employee.salonId, isActive: true },
          orderBy: { name: 'asc' },
        }),
      ])
      appointments = appts
      clients = clientList
      employees = employeeList
      services = serviceList
    }
  }

  // Si pas de data, on génère des faux RDV pour la démo
  if (appointments.length === 0) {
    const today = new Date()
    today.setHours(10, 0, 0, 0)
    
    appointments = [
      {
        id: '1',
        client: { firstName: 'Sophie L.' },
        service: { name: 'Balayage' },
        startTime: new Date(today),
        endTime: new Date(today.getTime() + 120 * 60000),
        status: 'SCHEDULED'
      },
      {
        id: '2',
        client: { firstName: 'Marc D.' },
        service: { name: 'Coupe Homme' },
        startTime: new Date(today.getTime() + 180 * 60000),
        endTime: new Date(today.getTime() + 210 * 60000),
        status: 'COMPLETED'
      }
    ]
  }

  const EMPLOYEE_COLORS = [
    '#D97757', // Caramel / Warm Terracotta
    '#4A8B9E', // Muted Blue
    '#7D9878', // Sage Green
    '#A67A97', // Soft Violet
    '#C48D82', // Blush Rose
    '#D1A15C', // Warm Gold
  ]

  const employeeColorMap = new Map<string, string>()
  employees.forEach((emp: any, index: number) => {
    employeeColorMap.set(emp.id, emp.color || EMPLOYEE_COLORS[index % EMPLOYEE_COLORS.length])
  })

  const formattedEvents = appointments.map((apt: any) => {
    const empColor = employeeColorMap.get(apt.employeeId) || 'hsl(var(--primary))'
    
    let bgColor = empColor
    let opacity = 'ff' // 100%
    if (apt.status === 'CANCELLED' || apt.status === 'NO_SHOW') {
      bgColor = '#94a3b8' // Slate 400 for cancelled
    } else if (apt.status === 'SCHEDULED') {
      opacity = 'cc' // 80%
    }

    return {
      id: apt.id,
      title: `${apt.client?.firstName || 'Client'} - ${apt.service?.name || 'Service'}`,
      start: apt.startTime instanceof Date ? apt.startTime.toISOString() : apt.startTime,
      end: apt.endTime instanceof Date ? apt.endTime.toISOString() : apt.endTime,
      backgroundColor: apt.status === 'SCHEDULED' ? `${bgColor}${opacity}` : bgColor,
      borderColor: bgColor,
      extendedProps: {
        status: apt.status,
        employeeId: apt.employeeId,
        employeeName: apt.employee?.name || '',
        serviceName: apt.service?.name || '',
        clientId: apt.client?.id || null,
        clientName: `${apt.client?.firstName || ''} ${apt.client?.lastName || ''}`.trim() || 'Client',
        price: apt.service?.price || 0,
        employeeColor: empColor
      }
    }
  })

  return (
    <AgendaClient
      appointments={formattedEvents}
      clients={clients.map(c => ({ id: c.id, firstName: c.firstName, lastName: c.lastName }))}
      employees={employees.map(e => ({ id: e.id, name: e.name }))}
      services={services.map(s => ({ id: s.id, name: s.name, duration: s.duration, price: s.price }))}
      salonId={salonId}
    />
  )
}
