'use server'

import { prisma } from '@/lib/prisma'

// MOCK: This acts as our API for WhatsApp message sending
export async function sendWhatsAppMessage(to: string, message: string) {
  console.log(`[MOCK WHATSAPP] Sending to ${to}:\n${message}`)
  
  // Simulated delay
  await new Promise(resolve => setTimeout(resolve, 500))

  return { success: true, messageId: `mock_msg_${Date.now()}` }
}

export async function sendAppointmentReminders(salonId: string, appointments: any[]) {
  const results = []

  for (const apt of appointments) {
    if (!apt.client.phone || apt.client.whatsappOptOut) {
      results.push({ id: apt.id, status: 'skipped (no phone or opt-out)' })
      continue
    }

    const time = new Date(apt.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    const message = `Bonjour ${apt.client.firstName}, rappel pour votre RDV demain à ${time} pour ${apt.service.name} avec ${apt.employee.name}. Répondez 1 pour confirmer ou 2 pour annuler.`

    const res = await sendWhatsAppMessage(apt.client.phone, message)
    results.push({ id: apt.id, status: res.success ? 'sent' : 'failed' })
  }

  return results
}

export async function sendAppointment30MinReminders(appointments: any[]) {
  const results = []

  for (const apt of appointments) {
    if (!apt.client.phone || apt.client.whatsappOptOut) {
      results.push({ id: apt.id, status: 'skipped (no phone or opt-out)' })
      continue
    }

    const time = new Date(apt.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    const message = `Bonjour ${apt.client.firstName}, petit rappel : votre rendez-vous pour ${apt.service.name} avec ${apt.employee.name} est prévu dans 30 minutes (à ${time}). À très vite !`

    const res = await sendWhatsAppMessage(apt.client.phone, message)
    if (res.success) {
      await prisma.appointment.update({
        where: { id: apt.id },
        data: { reminderSent30Min: true }
      })
    }
    results.push({ id: apt.id, status: res.success ? 'sent' : 'failed' })
  }

  return results
}

