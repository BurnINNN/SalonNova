import { prisma } from '@/lib/prisma'

// ============================================================
// DÉFINITIONS DES TOOLS (format Gemini)
// ============================================================

export const AI_TOOLS_DEFINITIONS = [
  {
    name: 'link_client_profile',
    description:
      "Recherche un client existant dans la base de données par nom ou numéro de téléphone, puis lie son profil à la conversation en cours. Utilise cet outil UNIQUEMENT quand le client te donne volontairement son nom complet ou son numéro de téléphone.",
    input_schema: {
      type: 'object' as const,
      properties: {
        firstName: {
          type: 'string',
          description: 'Prénom du client',
        },
        lastName: {
          type: 'string',
          description: 'Nom de famille du client (optionnel)',
        },
        phone: {
          type: 'string',
          description: 'Numéro de téléphone du client (optionnel, format international ex: 212612345678)',
        },
      },
      required: ['firstName'],
    },
  },
  {
    name: 'escalate_to_human',
    description:
      "Transfère la conversation à un humain (le gérant du salon). Utilise cet outil quand : 1) Le client demande explicitement à parler à un humain, 2) La question est trop complexe ou hors de ton périmètre, 3) Il y a une réclamation ou un problème urgent.",
    input_schema: {
      type: 'object' as const,
      properties: {
        reason: {
          type: 'string',
          description: 'Raison du transfert à un humain',
        },
      },
      required: ['reason'],
    },
  },
  {
    name: 'get_client_hair_profile',
    description:
      "Charge le profil capillaire complet du client lié à cette conversation : type de cheveux, état, formule coloration, allergies, dernières visites. Utilise cet outil après avoir identifié le client pour mieux le conseiller.",
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'propose_appointment',
    description:
      "Vérifie les créneaux disponibles pour un rendez-vous. Utilise cet outil quand le client a choisi une prestation et souhaite réserver. Retourne les créneaux libres pour la prestation demandée.",
    input_schema: {
      type: 'object' as const,
      properties: {
        serviceName: {
          type: 'string',
          description: 'Nom de la prestation souhaitée (ex: "Soin kératine", "Coupe femme")',
        },
        preferredDate: {
          type: 'string',
          description: 'Date souhaitée par le client au format YYYY-MM-DD (optionnel). Si non fourni, propose les prochains créneaux disponibles.',
        },
      },
      required: ['serviceName'],
    },
  },
  {
    name: 'create_appointment_request',
    description:
      "Crée un rendez-vous en attente de confirmation par le salon. Utilise cet outil UNIQUEMENT quand le client a confirmé la prestation ET le créneau proposé.",
    input_schema: {
      type: 'object' as const,
      properties: {
        serviceName: {
          type: 'string',
          description: 'Nom exact de la prestation choisie',
        },
        startTime: {
          type: 'string',
          description: 'Date et heure du rendez-vous au format ISO 8601 (ex: "2026-07-03T14:30:00")',
        },
        notes: {
          type: 'string',
          description: 'Notes sur le rendez-vous (état des cheveux, demande spécifique du client)',
        },
      },
      required: ['serviceName', 'startTime'],
    },
  },
]

// Format Gemini (seul moteur utilisé)
export function getGeminiTools() {
  return [{
    functionDeclarations: AI_TOOLS_DEFINITIONS.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema as any,
    })),
  }]
}

// ============================================================
// HANDLERS DES TOOLS
// ============================================================

interface ToolResult {
  success: boolean
  message: string
  data?: any
}

/**
 * Recherche un client par nom ou téléphone et le lie à la conversation.
 * Stratégie :
 * 1. Si un téléphone est donné → recherche exacte par téléphone
 * 2. Sinon → recherche par nom (firstName + lastName)
 * 3. Si aucun client trouvé → crée une nouvelle fiche client
 */
export async function handleLinkClientProfile(
  salonId: string,
  conversationId: string,
  channel: string,
  externalId: string,
  args: { firstName: string; lastName?: string; phone?: string }
): Promise<ToolResult> {
  try {
    let client = null

    // 1. Recherche par téléphone (prioritaire, plus fiable)
    if (args.phone) {
      const formattedPhone = formatPhone(args.phone)
      client = await prisma.client.findFirst({
        where: {
          salonId,
          phone: formattedPhone,
        },
      })
    }

    // 2. Recherche par nom
    if (!client && args.firstName) {
      client = await prisma.client.findFirst({
        where: {
          salonId,
          firstName: { contains: args.firstName, mode: 'insensitive' },
          ...(args.lastName
            ? { lastName: { contains: args.lastName, mode: 'insensitive' } }
            : {}),
        },
      })
    }

    // 3. Si aucun client trouvé, en créer un nouveau
    if (!client) {
      const channelIdField = getChannelIdField(channel)
      client = await prisma.client.create({
        data: {
          salonId,
          firstName: args.firstName,
          lastName: args.lastName || '',
          phone: args.phone ? formatPhone(args.phone) : null,
          ...(channelIdField ? { [channelIdField]: externalId } : {}),
        },
      })

      // Lier la conversation au nouveau client
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { clientId: client.id },
      })

      return {
        success: true,
        message: `Nouveau client créé : ${client.firstName} ${client.lastName}. Le profil a été lié à cette conversation.`,
        data: { clientId: client.id, isNew: true },
      }
    }

    // 4. Client trouvé → mettre à jour l'ID du canal et lier la conversation
    const channelIdField = getChannelIdField(channel)
    if (channelIdField && !client[channelIdField as keyof typeof client]) {
      await prisma.client.update({
        where: { id: client.id },
        data: { [channelIdField]: externalId },
      })
    }

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { clientId: client.id },
    })

    return {
      success: true,
      message: `Client trouvé : ${client.firstName} ${client.lastName}. Le profil a été lié à cette conversation.`,
      data: { clientId: client.id, isNew: false },
    }
  } catch (error) {
    console.error('[TOOL] link_client_profile error:', error)
    return {
      success: false,
      message: "Erreur lors de la recherche du client. Veuillez réessayer.",
    }
  }
}

/**
 * Passe la conversation en mode HUMAN pour qu'un gérant prenne le relais.
 */
export async function handleEscalateToHuman(
  conversationId: string,
  args: { reason: string }
): Promise<ToolResult> {
  try {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'HUMAN' },
    })

    // Enregistrer un message système pour tracer l'escalade
    await prisma.message.create({
      data: {
        conversationId,
        content: `[Transfert à un humain] Raison : ${args.reason}`,
        role: 'SYSTEM',
      },
    })

    return {
      success: true,
      message: `La conversation a été transférée à un humain. Raison : ${args.reason}`,
    }
  } catch (error) {
    console.error('[TOOL] escalate_to_human error:', error)
    return {
      success: false,
      message: "Erreur lors du transfert. Un humain sera notifié.",
    }
  }
}

/**
 * Charge le profil capillaire complet du client lié à la conversation.
 */
export async function handleGetClientHairProfile(
  salonId: string,
  conversationId: string
): Promise<ToolResult> {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    })

    if (!conversation?.clientId) {
      return {
        success: false,
        message: "Aucun client n'est lié à cette conversation. Demande d'abord le prénom du client et utilise link_client_profile.",
      }
    }

    const client = await prisma.client.findUnique({
      where: { id: conversation.clientId },
      include: {
        hairProfile: true,
        appointments: {
          orderBy: { startTime: 'desc' },
          take: 5,
          include: { service: true },
          where: { status: { in: ['COMPLETED', 'SCHEDULED'] } },
        },
      },
    })

    if (!client) {
      return { success: false, message: "Client introuvable." }
    }

    const profileData: any = {
      name: `${client.firstName} ${client.lastName}`.trim(),
      phone: client.phone,
      technicalNotes: client.technicalNotes,
      notes: client.notes,
      totalVisits: client.appointments.length,
    }

    if (client.hairProfile) {
      profileData.hairProfile = {
        hairType: client.hairProfile.hairType,
        hairCondition: client.hairProfile.hairCondition,
        colorFormula: client.hairProfile.colorFormula,
        sensitiveScalp: client.hairProfile.sensitiveScalp,
        allergies: client.hairProfile.allergies,
        lastColorDate: client.hairProfile.lastColorDate,
        preferredStyle: client.hairProfile.preferredStyle,
        notes: client.hairProfile.notes,
      }
    }

    if (client.appointments.length > 0) {
      profileData.recentVisits = client.appointments.map((a) => ({
        date: a.startTime.toISOString().split('T')[0],
        service: a.service?.name || 'Inconnu',
        notes: a.notes,
      }))
    }

    return {
      success: true,
      message: `Profil capillaire de ${profileData.name} chargé avec succès.`,
      data: profileData,
    }
  } catch (error) {
    console.error('[TOOL] get_client_hair_profile error:', error)
    return {
      success: false,
      message: "Erreur lors du chargement du profil capillaire.",
    }
  }
}

/**
 * Propose des créneaux disponibles pour un rendez-vous.
 * Vérifie les conflits avec les RDV existants.
 */
export async function handleProposeAppointment(
  salonId: string,
  args: { serviceName: string; preferredDate?: string }
): Promise<ToolResult> {
  try {
    // 1. Trouver le service correspondant
    const service = await prisma.service.findFirst({
      where: {
        salonId,
        isActive: true,
        name: { contains: args.serviceName, mode: 'insensitive' },
      },
    })

    if (!service) {
      return {
        success: false,
        message: `Prestation "${args.serviceName}" introuvable dans notre catalogue. Vérifie le nom exact.`,
      }
    }

    // 2. Calculer la plage de recherche
    const now = new Date()
    let searchStart: Date
    let searchEnd: Date

    if (args.preferredDate) {
      searchStart = new Date(args.preferredDate + 'T09:00:00')
      searchEnd = new Date(args.preferredDate + 'T19:00:00')
    } else {
      // Chercher dans les 7 prochains jours
      searchStart = new Date(now)
      searchStart.setHours(9, 0, 0, 0)
      if (now.getHours() >= 9) {
        // Commencer demain si on est déjà dans la journée
        searchStart.setDate(searchStart.getDate() + 1)
      }
      searchEnd = new Date(searchStart)
      searchEnd.setDate(searchEnd.getDate() + 7)
    }

    // 3. Récupérer les RDV existants dans la plage
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        salonId,
        status: { in: ['SCHEDULED', 'IN_PROGRESS', 'PENDING'] },
        startTime: { gte: searchStart, lte: searchEnd },
      },
      orderBy: { startTime: 'asc' },
    })

    // 4. Récupérer les employés du salon
    const employees = await prisma.employee.findMany({
      where: { salonId, role: 'HAIRDRESSER' },
    })

    // 5. Trouver des créneaux libres (logique simplifiée)
    const availableSlots: { date: string; time: string; employeeName?: string }[] = []

    const salon = await prisma.salon.findUnique({ where: { id: salonId } })
    const settings = salon?.settings ? (typeof salon.settings === 'string' ? JSON.parse(salon.settings) : salon.settings) : {}
    const delayMargin = Number((settings as any)?.delayMargin) || 0

    const serviceDuration = service.duration + (service.bufferMinutes || 0) + delayMargin

    // Parcourir les jours
    const currentDate = new Date(searchStart)
    while (currentDate <= searchEnd && availableSlots.length < 4) {
      // Skip dimanche (jour 0)
      if (currentDate.getDay() === 0) {
        currentDate.setDate(currentDate.getDate() + 1)
        continue
      }

      // Parcourir les heures de 9h à 18h
      for (let hour = 9; hour <= 18 && availableSlots.length < 4; hour++) {
        for (const halfHour of [0, 30]) {
          if (availableSlots.length >= 4) break

          const slotStart = new Date(currentDate)
          slotStart.setHours(hour, halfHour, 0, 0)

          const slotEnd = new Date(slotStart)
          slotEnd.setMinutes(slotEnd.getMinutes() + serviceDuration)

          // Vérifier que le créneau ne dépasse pas 19h
          if (slotEnd.getHours() > 19 || (slotEnd.getHours() === 19 && slotEnd.getMinutes() > 0)) {
            continue
          }

          // Vérifier qu'il n'y a pas de conflit avec un RDV existant
          const hasConflict = existingAppointments.some((appt) => {
            return slotStart < appt.endTime && slotEnd > appt.startTime
          })

          if (!hasConflict) {
            const dateStr = slotStart.toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })
            const timeStr = `${hour.toString().padStart(2, '0')}:${halfHour.toString().padStart(2, '0')}`

            availableSlots.push({
              date: dateStr,
              time: timeStr,
            })
          }
        }
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    if (availableSlots.length === 0) {
      return {
        success: true,
        message: "Aucun créneau disponible trouvé dans les prochains jours. Propose au client de contacter le salon directement.",
        data: { service: service.name, duration: service.duration, price: service.price, slots: [] },
      }
    }

    return {
      success: true,
      message: `${availableSlots.length} créneaux disponibles trouvés pour ${service.name}.`,
      data: {
        service: service.name,
        duration: service.duration,
        price: service.price,
        slots: availableSlots,
      },
    }
  } catch (error) {
    console.error('[TOOL] propose_appointment error:', error)
    return {
      success: false,
      message: "Erreur lors de la recherche de créneaux. Le salon confirmera directement.",
    }
  }
}

/**
 * Crée un rendez-vous en attente de confirmation.
 */
export async function handleCreateAppointmentRequest(
  salonId: string,
  conversationId: string,
  args: { serviceName: string; startTime: string; notes?: string }
): Promise<ToolResult> {
  try {
    // 1. Trouver le client de la conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    })

    if (!conversation?.clientId) {
      return {
        success: false,
        message: "Impossible de créer le RDV : aucun client identifié. Demande d'abord le prénom du client.",
      }
    }

    // 2. Trouver le service
    const service = await prisma.service.findFirst({
      where: {
        salonId,
        isActive: true,
        name: { contains: args.serviceName, mode: 'insensitive' },
      },
    })

    if (!service) {
      return {
        success: false,
        message: `Prestation "${args.serviceName}" introuvable.`,
      }
    }

    // 3. Trouver un coiffeur disponible pour ce créneau
    const employees = await prisma.employee.findMany({
      where: { salonId, role: 'HAIRDRESSER' },
    })

    if (employees.length === 0) {
      return {
        success: false,
        message: "Aucun coiffeur disponible au salon.",
      }
    }

    // 4. Calculer l'heure de fin
    const startTime = new Date(args.startTime)
    const endTime = new Date(startTime)

    const salon = await prisma.salon.findUnique({ where: { id: salonId } })
    const settings = salon?.settings ? (typeof salon.settings === 'string' ? JSON.parse(salon.settings) : salon.settings) : {}
    const delayMargin = Number((settings as any)?.delayMargin) || 0

    endTime.setMinutes(endTime.getMinutes() + service.duration + (service.bufferMinutes || 0) + delayMargin)

    // 5. Trouver le premier coiffeur sans conflit
    let assignedEmployee = null
    for (const emp of employees) {
      const conflicting = await prisma.appointment.findFirst({
        where: {
          salonId,
          employeeId: emp.id,
          status: { in: ['SCHEDULED', 'IN_PROGRESS', 'PENDING'] },
          OR: [
            { startTime: { lt: endTime }, endTime: { gt: startTime } },
          ],
        },
      })
      if (!conflicting) {
        assignedEmployee = emp
        break
      }
    }

    if (!assignedEmployee) {
      return {
        success: false,
        message: "Ce créneau n'est plus disponible (tous les coiffeurs sont occupés). Propose un autre créneau au client.",
      }
    }

    // 6. Créer le rendez-vous en statut PENDING
    const appointment = await prisma.appointment.create({
      data: {
        salonId,
        clientId: conversation.clientId,
        serviceId: service.id,
        employeeId: assignedEmployee.id,
        startTime,
        endTime,
        status: 'PENDING',
        bookedVia: 'AI_AGENT',
        notes: args.notes || null,
      },
    })

    // 7. Charger le nom du client pour la confirmation
    const client = await prisma.client.findUnique({
      where: { id: conversation.clientId },
    })

    return {
      success: true,
      message: `Rendez-vous créé avec succès ! Le salon confirmera sous 1h.`,
      data: {
        appointmentId: appointment.id,
        clientName: client ? `${client.firstName} ${client.lastName}`.trim() : 'Client',
        service: service.name,
        duration: `${service.duration} min`,
        price: `${service.price} MAD`,
        startTime: startTime.toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit',
        }),
        employee: assignedEmployee.name,
      },
    }
  } catch (error) {
    console.error('[TOOL] create_appointment_request error:', error)
    return {
      success: false,
      message: "Erreur lors de la création du rendez-vous. Le salon vous contactera directement.",
    }
  }
}

/**
 * Dispatche l'appel vers le bon handler selon le nom de l'outil.
 */
export async function executeToolCall(
  toolName: string,
  toolArgs: any,
  context: { salonId: string; conversationId: string; channel: string; externalId: string }
): Promise<ToolResult> {
  switch (toolName) {
    case 'link_client_profile':
      return handleLinkClientProfile(
        context.salonId,
        context.conversationId,
        context.channel,
        context.externalId,
        toolArgs
      )
    case 'escalate_to_human':
      return handleEscalateToHuman(context.conversationId, toolArgs)
    case 'get_client_hair_profile':
      return handleGetClientHairProfile(context.salonId, context.conversationId)
    case 'propose_appointment':
      return handleProposeAppointment(context.salonId, toolArgs)
    case 'create_appointment_request':
      return handleCreateAppointmentRequest(
        context.salonId,
        context.conversationId,
        toolArgs
      )
    default:
      return { success: false, message: `Outil inconnu : ${toolName}` }
  }
}

// ============================================================
// UTILITAIRES
// ============================================================

function formatPhone(phone: string): string {
  // Supprimer tous les caractères non numériques sauf le +
  let cleaned = phone.replace(/[^\d+]/g, '')
  // S'assurer qu'il commence par un +
  if (!cleaned.startsWith('+') && !cleaned.startsWith('00')) {
    // Ajouter le préfixe Maroc par défaut si pas de code pays
    if (cleaned.startsWith('0')) {
      cleaned = '+212' + cleaned.slice(1)
    } else if (cleaned.startsWith('212')) {
      cleaned = '+' + cleaned
    } else {
      cleaned = '+' + cleaned
    }
  }
  return cleaned
}

function getChannelIdField(channel: string): string | null {
  switch (channel) {
    case 'WHATSAPP':
      return 'whatsappId'
    case 'INSTAGRAM':
      return 'instagramId'
    case 'MESSENGER':
      return 'messengerId'
    default:
      return null
  }
}
