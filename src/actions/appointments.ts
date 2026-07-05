'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { addMinutes } from 'date-fns'
import { sendChannelMessage } from '@/lib/meta/send'

const SLOT_INTERVAL_MINUTES = 30

// ── Schémas ────────────────────────────────────────────────────────────────

const CreateAppointmentSchema = z.object({
  clientId: z.string(),
  employeeId: z.string(),
  serviceId: z.string(),
  startTime: z.string(),
  salonId: z.string(),
  notes: z.string().optional(),
  bookedVia: z
    .enum(['MANUAL', 'AI_AGENT', 'WHATSAPP', 'INSTAGRAM', 'MESSENGER'])
    .default('MANUAL'),
})

const UpdateAppointmentSchema = z.object({
  id: z.string(),
  startTime: z.string().optional(),
  status: z.enum(['PENDING', 'SCHEDULED', 'COMPLETED', 'NO_SHOW', 'CANCELLED']).optional(),
  notes: z.string().optional(),
  employeeId: z.string().optional(),
  serviceId: z.string().optional(),
})

// ── Helpers ────────────────────────────────────────────────────────────────

async function getServiceDuration(serviceId: string): Promise<number> {
  const service = await prisma.service.findUnique({ where: { id: serviceId } })
  if (!service) throw new Error('Prestation introuvable')
  return service.duration
}

async function checkConflict(
  employeeId: string,
  startTime: Date,
  endTime: Date,
  excludeId?: string
): Promise<boolean> {
  const conflict = await prisma.appointment.findFirst({
    where: {
      employeeId,
      status: { in: ['SCHEDULED', 'PENDING'] },
      id: excludeId ? { not: excludeId } : undefined,
      AND: [
        { startTime: { lt: endTime } },
        { endTime: { gt: startTime } },
      ],
    },
  })
  return !!conflict
}

// ── CRUD Appointments ──────────────────────────────────────────────────────

export async function createAppointment(
  input: z.infer<typeof CreateAppointmentSchema>
) {
  const data = CreateAppointmentSchema.parse(input)

  const service = await prisma.service.findUnique({ where: { id: data.serviceId } })
  if (!service) throw new Error('Prestation introuvable')

  // Récupérer la marge de retard depuis les réglages du salon
  const salon = await prisma.salon.findUnique({ where: { id: data.salonId } })
  const settings = salon?.settings ? (typeof salon.settings === 'string' ? JSON.parse(salon.settings) : salon.settings) : {}
  const delayMargin = Number((settings as any)?.delayMargin) || 0

  const totalDuration = service.duration + (service.bufferMinutes || 0) + delayMargin
  const startTime = new Date(data.startTime)
  const endTime = addMinutes(startTime, totalDuration)

  const hasConflict = await checkConflict(data.employeeId, startTime, endTime)
  if (hasConflict) throw new Error('Ce créneau est déjà réservé.')

  const appointment = await prisma.appointment.create({
    data: { ...data, startTime, endTime },
    include: { client: true, service: true, employee: true },
  })

  // Déclencher la consommation automatique de stock
  await autoDeductStock(appointment.serviceId, appointment.id, data.salonId)

  revalidatePath('/agenda')
  revalidatePath('/dashboard')
  return appointment
}

export async function updateAppointment(
  input: z.infer<typeof UpdateAppointmentSchema>
) {
  const { id, startTime, serviceId, employeeId, ...rest } = UpdateAppointmentSchema.parse(input)

  const existing = await prisma.appointment.findUnique({
    where: { id },
    include: { service: true },
  })
  if (!existing) throw new Error('Rendez-vous introuvable')

  let endTime: Date | undefined
  const targetEmployeeId = employeeId ?? existing.employeeId
  const targetServiceId = serviceId ?? existing.serviceId

  if (startTime || serviceId) {
    const newStart = startTime ? new Date(startTime) : existing.startTime
    const service = serviceId
      ? await prisma.service.findUnique({ where: { id: serviceId } })
      : existing.service
    if (!service) throw new Error('Prestation introuvable')

    // Récupérer la marge de retard depuis les réglages du salon
    const salon = await prisma.salon.findUnique({ where: { id: existing.salonId } })
    const settings = salon?.settings ? (typeof salon.settings === 'string' ? JSON.parse(salon.settings) : salon.settings) : {}
    const delayMargin = Number((settings as any)?.delayMargin) || 0

    const totalDuration = service.duration + (service.bufferMinutes || 0) + delayMargin
    endTime = addMinutes(newStart, totalDuration)

    const hasConflict = await checkConflict(
      targetEmployeeId,
      newStart,
      endTime,
      id
    )
    if (hasConflict) throw new Error('Ce créneau est déjà réservé.')
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      ...rest,
      ...(startTime && { startTime: new Date(startTime) }),
      ...(endTime && { endTime }),
      ...(employeeId && { employeeId }),
      ...(serviceId && { serviceId }),
    },
    include: { client: true, service: true, employee: true },
  })

  revalidatePath('/agenda')
  revalidatePath('/dashboard')
  return updated
}

export async function cancelAppointment(id: string) {
  const appointment = await prisma.appointment.update({
    where: { id },
    data: { status: 'CANCELLED' },
  })
  revalidatePath('/agenda')
  return appointment
}

export async function markCompleted(id: string) {
  const appointment = await prisma.appointment.update({
    where: { id },
    data: { status: 'COMPLETED' },
    include: { service: true },
  })
  revalidatePath('/agenda')
  revalidatePath('/dashboard')
  return appointment
}

export async function markNoShow(id: string) {
  const appointment = await prisma.appointment.update({
    where: { id },
    data: { status: 'NO_SHOW' },
  })
  revalidatePath('/agenda')
  revalidatePath('/dashboard')
  return appointment
}

// ── Disponibilités ─────────────────────────────────────────────────────────

export async function checkAvailability(
  salonId: string,
  employeeId: string,
  date: string,
  serviceDuration: number
): Promise<string[]> {
  const targetDate = new Date(date)
  const dayStart = new Date(targetDate)
  dayStart.setHours(9, 0, 0, 0)
  const dayEnd = new Date(targetDate)
  dayEnd.setHours(19, 0, 0, 0)

  const existingAppointments = await prisma.appointment.findMany({
    where: {
      salonId,
      employeeId,
      startTime: { gte: dayStart, lte: dayEnd },
      status: { in: ['SCHEDULED', 'PENDING'] },
    },
    orderBy: { startTime: 'asc' },
  })

  const slots: string[] = []
  let cursor = new Date(dayStart)

  while (addMinutes(cursor, serviceDuration) <= dayEnd) {
    const slotEnd = addMinutes(cursor, serviceDuration)
    const hasConflict = existingAppointments.some(
      apt =>
        apt.startTime < slotEnd && apt.endTime > cursor
    )
    if (!hasConflict) slots.push(cursor.toISOString())
    cursor = addMinutes(cursor, SLOT_INTERVAL_MINUTES)
  }

  return slots
}

export async function getAppointmentsForCalendar(
  salonId: string,
  start: string,
  end: string
) {
  const appointments = await prisma.appointment.findMany({
    where: {
      salonId,
      startTime: { gte: new Date(start), lte: new Date(end) },
      status: { not: 'CANCELLED' },
    },
    include: {
      client: true,
      service: true,
      employee: true,
    },
    orderBy: { startTime: 'asc' },
  })

  // Formater pour FullCalendar
  return appointments.map(apt => ({
    id: apt.id,
    title: `${apt.client.firstName} — ${apt.service.name}`,
    start: apt.startTime.toISOString(),
    end: apt.endTime.toISOString(),
    backgroundColor: apt.status === 'PENDING' ? '#d97706' : apt.status === 'NO_SHOW' ? '#ef4444' : '#3b82f6',
    extendedProps: {
      status: apt.status,
      employeeName: apt.employee.name,
      serviceName: apt.service.name,
      clientName: `${apt.client.firstName} ${apt.client.lastName}`,
      price: apt.service.price,
    },
  }))
}

// ── Consommation automatique de stock ─────────────────────────────────────

async function autoDeductStock(
  serviceId: string,
  appointmentId: string,
  salonId: string
) {
  const { autoDeductStockForAppointment } = await import('./stock')
  await autoDeductStockForAppointment(serviceId, appointmentId, salonId)
}

export async function confirmAppointment(id: string, conversationId?: string) {
  const appointment = await prisma.appointment.update({
    where: { id },
    data: { status: 'SCHEDULED' },
    include: { client: true, service: true, employee: true }
  })

  if (conversationId) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    })

    if (conversation) {
      const timeStr = appointment.startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      const dateStr = appointment.startTime.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
      
      const confirmationMsg = `Votre rendez-vous du ${dateStr} à ${timeStr} pour la prestation ${appointment.service.name} avec ${appointment.employee.name} a été validé ! Nous vous attendons avec impatience.`

      await prisma.message.create({
        data: {
          conversationId,
          content: `[Rendez-vous de ${appointment.client.firstName} pour ${appointment.service.name} CONFIRMÉ]`,
          role: 'SYSTEM',
        }
      })

      await prisma.message.create({
        data: {
          conversationId,
          content: confirmationMsg,
          role: 'ASSISTANT',
        }
      })

      let whatsappInstanceName: string | undefined
      if (conversation.channel === 'WHATSAPP') {
        const salon = await prisma.salon.findUnique({ where: { id: conversation.salonId } })
        whatsappInstanceName = (salon?.settings as any)?.whatsappInstanceName
      }

      try {
        await sendChannelMessage(
          conversation.channel,
          conversation.externalId,
          confirmationMsg,
          whatsappInstanceName
        )
      } catch (error) {
        console.error('[CONFIRM_APT] Erreur envoi message:', error)
      }

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() }
      })
    }
  }

  revalidatePath('/agenda')
  revalidatePath('/dashboard')
  revalidatePath('/inbox')
  return { success: true, appointment }
}

export async function rejectAppointment(id: string, conversationId?: string) {
  const appointment = await prisma.appointment.update({
    where: { id },
    data: { status: 'CANCELLED' },
    include: { client: true, service: true, employee: true }
  })

  if (conversationId) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    })

    if (conversation) {
      const timeStr = appointment.startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      const dateStr = appointment.startTime.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
      
      const rejectionMsg = `Bonjour ${appointment.client.firstName}, malheureusement nous ne pouvons pas valider votre demande de rendez-vous du ${dateStr} à ${timeStr} pour ${appointment.service.name}. N'hésitez pas à nous proposer un autre créneau !`

      await prisma.message.create({
        data: {
          conversationId,
          content: `[Rendez-vous de ${appointment.client.firstName} pour ${appointment.service.name} REFUSÉ/ANNULÉ]`,
          role: 'SYSTEM',
        }
      })

      await prisma.message.create({
        data: {
          conversationId,
          content: rejectionMsg,
          role: 'ASSISTANT',
        }
      })

      let whatsappInstanceName: string | undefined
      if (conversation.channel === 'WHATSAPP') {
        const salon = await prisma.salon.findUnique({ where: { id: conversation.salonId } })
        whatsappInstanceName = (salon?.settings as any)?.whatsappInstanceName
      }

      try {
        await sendChannelMessage(
          conversation.channel,
          conversation.externalId,
          rejectionMsg,
          whatsappInstanceName
        )
      } catch (error) {
        console.error('[REJECT_APT] Erreur envoi message:', error)
      }

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() }
      })
    }
  }

  revalidatePath('/agenda')
  revalidatePath('/dashboard')
  revalidatePath('/inbox')
  return { success: true, appointment }
}
