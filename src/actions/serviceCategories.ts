'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getServiceCategories(salonId: string) {
  return prisma.serviceCategory.findMany({
    where: { salonId },
    orderBy: { order: 'asc' },
  })
}

export async function createServiceCategory(data: { name: string, color?: string, order?: number, salonId: string }) {
  const category = await prisma.serviceCategory.create({ data })
  revalidatePath('/settings/services')
  return category
}

export async function updateServiceCategory(id: string, data: { name?: string, color?: string, order?: number }) {
  const category = await prisma.serviceCategory.update({
    where: { id },
    data,
  })
  revalidatePath('/settings/services')
  return category
}

export async function deleteServiceCategory(id: string) {
  await prisma.serviceCategory.delete({
    where: { id },
  })
  revalidatePath('/settings/services')
}
