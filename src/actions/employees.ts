'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const EmployeeSchema = z.object({
  salonId: z.string(),
  name: z.string().min(2, 'Nom obligatoire'),
  email: z.union([z.literal(''), z.string().email('Email invalide')]).optional().nullable(),
  phone: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  salaryType: z.enum(['FIXED', 'COMMISSION', 'BOTH']).default('COMMISSION'),
  baseSalary: z.number().min(0).optional().nullable(),
  commissionRate: z.number().min(0).max(100).optional().nullable(),
  role: z.enum(['MANAGER', 'HAIRDRESSER']).default('HAIRDRESSER'),
})

export type EmployeeInput = z.infer<typeof EmployeeSchema>

export async function getEmployees(salonId: string) {
  return prisma.employee.findMany({
    where: { salonId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createEmployee(input: EmployeeInput) {
  const data = EmployeeSchema.parse(input)
  
  const employee = await prisma.employee.create({
    data,
  })

  revalidatePath('/settings/team')
  return employee
}

export async function updateEmployee(id: string, input: Partial<EmployeeInput>) {
  const employee = await prisma.employee.update({
    where: { id },
    data: input,
  })

  revalidatePath('/settings/team')
  return employee
}

export async function deleteEmployee(id: string) {
  // Optionnel: Vérifier s'il a des transactions ou RDV futurs avant de supprimer
  await prisma.employee.delete({
    where: { id },
  })
  revalidatePath('/settings/team')
}

export async function getEmployeeStats(salonId: string, startDate: Date, endDate: Date) {
  const employees = await prisma.employee.findMany({ where: { salonId } })
  
  const transactions = await prisma.transaction.findMany({
    where: {
      salonId,
      createdAt: { gte: startDate, lte: endDate },
      cancelledAt: null,
      employeeId: { not: null }
    }
  })

  const stats: Record<string, { ca: number; appointmentsCount: number; baseSalary: number; salaryType: string }> = {}

  employees.forEach(e => {
    stats[e.id] = { ca: 0, appointmentsCount: 0, baseSalary: e.baseSalary || 0, salaryType: e.salaryType }
  })

  transactions.forEach(t => {
    if (t.employeeId && stats[t.employeeId]) {
      stats[t.employeeId].ca += t.amountPaid
      stats[t.employeeId].appointmentsCount += 1
    }
  })

  return stats
}
