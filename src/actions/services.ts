'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { ServiceSchema, ServiceInput } from '@/lib/validations/services'

export async function getServices(salonId: string) {
  return prisma.service.findMany({
    where: { salonId, isActive: true },
    orderBy: { name: 'asc' },
    include: { category: true },
  })
}



export async function createService(input: ServiceInput) {
  const data = ServiceSchema.parse(input)
  const service = await prisma.service.create({ data })
  revalidatePath('/settings/services')
  return service
}

export async function updateService(id: string, input: Partial<ServiceInput>) {
  const service = await prisma.service.update({
    where: { id },
    data: input,
  })
  revalidatePath('/settings/services')
  return service
}

export async function deleteService(id: string, salonId: string) {
  // Vérifier qu'il n'y a pas de RDV futurs liés
  const futureAppointments = await prisma.appointment.count({
    where: {
      serviceId: id,
      salonId,
      startTime: { gte: new Date() },
      status: 'SCHEDULED',
    },
  })

  if (futureAppointments > 0) {
    throw new Error(`Impossible de supprimer : ${futureAppointments} rendez-vous à venir utilisent cette prestation.`)
  }

  // Soft delete
  await prisma.service.update({
    where: { id },
    data: { isActive: false },
  })
  revalidatePath('/settings/services')
}

export async function getServiceWithProducts(id: string, salonId: string) {
  return prisma.service.findFirst({
    where: { id, salonId },
    include: {
      serviceProducts: {
        include: { product: true }
      }
    }
  })
}
