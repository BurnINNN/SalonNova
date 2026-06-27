'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ── Schémas de validation ──────────────────────────────────────────────────

const ClientSchema = z.object({
  firstName: z.string().min(1, 'Prénom requis'),
  lastName: z.string().min(1, 'Nom requis'),
  phone: z.string().optional(),
  whatsappId: z.string().optional(),
  whatsappOptOut: z.boolean().optional().default(false),
  instagramId: z.string().optional(),
  messengerId: z.string().optional(),
  salonId: z.string(),
})

const HairProfileSchema = z.object({
  clientId: z.string(),
  hairType: z.string().optional(),
  hairCondition: z.string().optional(),
  colorFormula: z.string().optional(),
  sensitiveScalp: z.boolean().default(false),
  allergies: z.string().optional(),
  preferredStyle: z.string().optional(),
  lastColorDate: z.string().optional(),
  notes: z.string().optional(),
})

// ── CRUD Client ────────────────────────────────────────────────────────────

export async function createClient(input: z.infer<typeof ClientSchema>) {
  const data = ClientSchema.parse(input)

  // Vérifier doublon sur le téléphone dans ce salon
  if (data.phone) {
    const existing = await prisma.client.findFirst({
      where: { salonId: data.salonId, phone: data.phone },
    })
    if (existing) throw new Error('Un client avec ce numéro existe déjà.')
  }

  const client = await prisma.client.create({ data })
  revalidatePath('/clients')
  return client
}

export async function updateClient(
  id: string,
  input: Partial<z.infer<typeof ClientSchema>>
) {
  const client = await prisma.client.update({
    where: { id },
    data: input,
  })
  revalidatePath('/clients')
  revalidatePath(`/clients/${id}`)
  return client
}

export async function deleteClient(id: string, salonId: string) {
  // Vérifier qu'il n'y a pas de RDV futurs actifs
  const futureAppointments = await prisma.appointment.count({
    where: {
      clientId: id,
      salonId,
      startTime: { gte: new Date() },
      status: 'SCHEDULED',
    },
  })
  if (futureAppointments > 0) {
    throw new Error(
      `Impossible de supprimer : ${futureAppointments} rendez-vous à venir.`
    )
  }
  await prisma.client.delete({ where: { id } })
  revalidatePath('/clients')
}

export async function searchClients(salonId: string, query: string) {
  return prisma.client.findMany({
    where: {
      salonId,
      OR: [
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query } },
      ],
    },
    include: {
      _count: { select: { appointments: true } },
    },
    orderBy: { lastName: 'asc' },
    take: 20,
  })
}

export async function getClientWithHistory(id: string, salonId: string) {
  const client = await prisma.client.findFirst({
    where: { id, salonId },
    include: {
      hairProfile: true,
      appointments: {
        include: { service: true, employee: true },
        orderBy: { startTime: 'desc' },
        take: 50,
      },
      transactions: {
        where: { cancelledAt: null },
        include: { employee: true, lines: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }
    },
  })

  if (!client) return null

  // Fusionner les rendez-vous et les transactions pour l'historique
  // Les transactions représentent les vraies visites payées
  const historyMap = new Map()

  client.transactions.forEach(t => {
    historyMap.set(t.id, {
      id: t.id,
      startTime: t.createdAt,
      status: 'COMPLETED',
      service: { name: t.lines.map(l => l.label).join(', ') || 'Achat', price: t.totalAmount },
      employee: { name: t.employee?.name || 'Inconnu' },
      isTransaction: true
    })
  })

  // Ajouter les RDV qui n'ont pas de transaction (futurs, annulés, no-show)
  client.appointments.forEach(a => {
    // Si le RDV est lié à une transaction, on l'a déjà ajouté ou on s'en fiche car la transaction prime
    // Mais on peut l'inclure s'il est NO_SHOW ou SCHEDULED
    if (a.status !== 'COMPLETED') {
      historyMap.set(a.id, {
        id: a.id,
        startTime: a.startTime,
        status: a.status,
        service: { name: a.service.name, price: a.service.price },
        employee: { name: a.employee.name },
        isTransaction: false
      })
    }
  })

  const mergedHistory = Array.from(historyMap.values()).sort((a, b) => b.startTime.getTime() - a.startTime.getTime())

  return {
    ...client,
    appointments: mergedHistory
  }
}

// ── Profil Capillaire ──────────────────────────────────────────────────────

export async function upsertHairProfile(input: z.infer<typeof HairProfileSchema>) {
  const data = HairProfileSchema.parse(input)
  const { clientId, lastColorDate, ...rest } = data

  const profile = await prisma.hairProfile.upsert({
    where: { clientId },
    update: {
      ...rest,
      lastColorDate: lastColorDate ? new Date(lastColorDate) : undefined,
    },
    create: {
      clientId,
      ...rest,
      lastColorDate: lastColorDate ? new Date(lastColorDate) : undefined,
    },
  })
  revalidatePath(`/clients/${clientId}`)
  return profile
}

// ── Statistiques client ────────────────────────────────────────────────────

export async function getClientStats(clientId: string, salonId: string) {
  const transactions = await prisma.transaction.findMany({
    where: { clientId, salonId, cancelledAt: null },
  })

  const totalVisits = transactions.length
  const totalSpent = transactions.reduce((sum, t) => sum + t.totalAmount, 0)
  const lastVisit = transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]?.createdAt

  const appointments = await prisma.appointment.findMany({
    where: { clientId, salonId, status: 'NO_SHOW' },
  })
  const noShows = appointments.length

  return { totalVisits, noShows, totalSpent, lastVisit }
}
