'use server'

import { prisma } from '@/lib/prisma'
import { sendChannelMessage } from '@/lib/meta/send'
import { createClient } from '@/lib/supabase/server'

// ============================================================
// HELPERS — Récupérer le salonId de l'utilisateur connecté
// ============================================================

async function getSalonId(): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const employee = await prisma.employee.findUnique({
    where: { userId: user.id },
  })
  if (!employee) throw new Error('Employé non trouvé')

  return employee.salonId
}

// ============================================================
// CONVERSATIONS
// ============================================================

/**
 * Récupère toutes les conversations du salon avec le dernier message et le client.
 */
export async function getConversations(statusFilter?: string) {
  const salonId = await getSalonId()

  const conversations = await prisma.conversation.findMany({
    where: {
      salonId,
      ...(statusFilter && statusFilter !== 'ALL' ? { status: statusFilter as any } : {}),
    },
    include: {
      client: {
        include: {
          appointments: {
            where: {
              status: 'PENDING',
            },
            include: {
              service: true,
              employee: true,
            },
            orderBy: {
              startTime: 'asc',
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      _count: {
        select: { messages: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return conversations
}

/**
 * Récupère les messages d'une conversation.
 */
export async function getMessages(conversationId: string) {
  const salonId = await getSalonId()

  // Vérifier que la conversation appartient au salon
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, salonId },
  })
  if (!conversation) throw new Error('Conversation non trouvée')

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
  })

  return messages
}

/**
 * Récupère les compteurs de conversations par statut.
 */
export async function getConversationCounts() {
  const salonId = await getSalonId()

  const [bot, human, resolved, total] = await Promise.all([
    prisma.conversation.count({ where: { salonId, status: 'BOT' } }),
    prisma.conversation.count({ where: { salonId, status: 'HUMAN' } }),
    prisma.conversation.count({ where: { salonId, status: 'RESOLVED' } }),
    prisma.conversation.count({ where: { salonId } }),
  ])

  return { bot, human, resolved, total }
}

// ============================================================
// ENVOI DE MESSAGES (mode humain)
// ============================================================

/**
 * Envoie un message en tant qu'humain (gérant).
 */
export async function sendHumanMessage(conversationId: string, content: string) {
  const salonId = await getSalonId()

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, salonId },
  })
  if (!conversation) throw new Error('Conversation non trouvée')

  // Enregistrer le message
  const message = await prisma.message.create({
    data: {
      conversationId,
      content,
      role: 'ASSISTANT',
    },
  })

  // Mettre à jour le timestamp
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  })

  // Récupérer le whatsappInstanceName si WhatsApp
  let whatsappInstanceName: string | undefined
  if (conversation.channel === 'WHATSAPP') {
    const salon = await prisma.salon.findUnique({ where: { id: salonId } })
    whatsappInstanceName = (salon?.settings as any)?.whatsappInstanceName
  }

  // Envoyer via Meta API (ou mock)
  try {
    await sendChannelMessage(
      conversation.channel,
      conversation.externalId,
      content,
      whatsappInstanceName
    )
  } catch (error) {
    console.error('[INBOX] Erreur envoi message:', error)
    // Le message est déjà sauvé en BDD, juste un log d'erreur
  }

  return message
}

// ============================================================
// GESTION DU STATUT
// ============================================================

/**
 * Le gérant prend la main sur la conversation (BOT → HUMAN).
 */
export async function takeOverConversation(conversationId: string) {
  const salonId = await getSalonId()

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { status: 'HUMAN' },
  })

  await prisma.message.create({
    data: {
      conversationId,
      content: '[Le gérant a pris la main sur cette conversation]',
      role: 'SYSTEM',
    },
  })

  return { success: true }
}

/**
 * Résoudre/fermer une conversation (→ RESOLVED).
 */
export async function resolveConversation(conversationId: string) {
  const salonId = await getSalonId()

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { status: 'RESOLVED' },
  })

  await prisma.message.create({
    data: {
      conversationId,
      content: '[Conversation résolue et fermée]',
      role: 'SYSTEM',
    },
  })

  return { success: true }
}

/**
 * Réactiver le bot sur une conversation (HUMAN/RESOLVED → BOT).
 */
export async function reactivateBotConversation(conversationId: string) {
  const salonId = await getSalonId()

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { status: 'BOT' },
  })

  await prisma.message.create({
    data: {
      conversationId,
      content: '[Le bot a repris la gestion de cette conversation]',
      role: 'SYSTEM',
    },
  })

  return { success: true }
}
