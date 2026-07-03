'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'

/**
  * Régénère un nouveau jeton unique de calendrier pour un employé donné.
  * Cela invalide automatiquement l'ancien lien de synchronisation.
  */
export async function regenerateCalendarToken(employeeId: string) {
  if (!employeeId) {
    throw new Error('Identifiant d\'employé requis')
  }

  const token = randomUUID()

  const updatedEmployee = await prisma.employee.update({
    where: { id: employeeId },
    data: { calendarToken: token },
  })

  revalidatePath('/settings/integrations')
  return { success: true, token: updatedEmployee.calendarToken }
}
