/**
 * Module de parsing des fiches rendez-vous générées par l'IA.
 * 
 * L'IA génère un bloc [RDV_JSON]{...}[/RDV_JSON] dans ses réponses
 * quand un rendez-vous est prêt à être créé. Ce module :
 * 1. Détecte ce pattern dans le texte
 * 2. Parse le JSON
 * 3. Crée un rendez-vous en base de données
 * 4. Nettoie le texte (retire le bloc JSON brut)
 */

import { prisma } from '@/lib/prisma'

interface RdvJson {
  nom: string
  prestation: string
  duree: string
  prix: string
  creneau: string
  telephone?: string
  notes?: string
}

interface ParseResult {
  cleanedText: string       // Texte sans le bloc [RDV_JSON]
  rdvData: RdvJson | null   // Données du RDV parsé
  appointmentCreated: boolean
  appointmentId?: string
  error?: string
}

const RDV_PATTERN = /\[RDV_JSON\]([\s\S]*?)\[\/RDV_JSON\]/

/**
 * Vérifie si le texte contient un bloc [RDV_JSON].
 */
export function hasRdvJson(text: string): boolean {
  return RDV_PATTERN.test(text)
}

/**
 * Extrait, parse et traite le bloc [RDV_JSON] d'une réponse IA.
 * Crée le rendez-vous en base de données si possible.
 */
export async function parseAndCreateRdv(
  text: string,
  salonId: string,
  conversationId: string
): Promise<ParseResult> {
  const match = text.match(RDV_PATTERN)

  if (!match) {
    return { cleanedText: text, rdvData: null, appointmentCreated: false }
  }

  // 1. Parser le JSON
  let rdvData: RdvJson
  try {
    rdvData = JSON.parse(match[1].trim())
  } catch (error) {
    console.error('[RDV_PARSER] JSON invalide:', match[1])
    return {
      cleanedText: text.replace(RDV_PATTERN, '').trim(),
      rdvData: null,
      appointmentCreated: false,
      error: 'JSON invalide dans le bloc RDV_JSON',
    }
  }

  // 2. Nettoyer le texte (retirer le bloc JSON brut)
  const cleanedText = text.replace(RDV_PATTERN, '').trim()

  // 3. Tenter de créer le rendez-vous en BDD
  try {
    const appointment = await createAppointmentFromRdv(rdvData, salonId, conversationId)

    if (appointment) {
      return {
        cleanedText,
        rdvData,
        appointmentCreated: true,
        appointmentId: appointment.id,
      }
    }

    return {
      cleanedText,
      rdvData,
      appointmentCreated: false,
      error: 'Impossible de créer le RDV (données manquantes)',
    }
  } catch (error) {
    console.error('[RDV_PARSER] Erreur création RDV:', error)
    return {
      cleanedText,
      rdvData,
      appointmentCreated: false,
      error: 'Erreur lors de la création du RDV en base',
    }
  }
}

/**
 * Crée un rendez-vous en base de données à partir des données du RDV_JSON.
 */
async function createAppointmentFromRdv(
  rdv: RdvJson,
  salonId: string,
  conversationId: string
) {
  // 1. Trouver le client de la conversation
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  })

  if (!conversation?.clientId) {
    console.warn('[RDV_PARSER] Pas de client lié à la conversation')
    return null
  }

  // 2. Trouver le service correspondant
  const service = await prisma.service.findFirst({
    where: {
      salonId,
      isActive: true,
      name: { contains: rdv.prestation, mode: 'insensitive' },
    },
  })

  if (!service) {
    console.warn('[RDV_PARSER] Service non trouvé:', rdv.prestation)
    return null
  }

  // 4. Parser le créneau (format flexible)
  const startTime = parseCreneauToDate(rdv.creneau)
  if (!startTime) {
    console.warn('[RDV_PARSER] Impossible de parser le créneau:', rdv.creneau)
    return null
  }

  // 5. Calculer l'heure de fin
  const endTime = new Date(startTime)
  endTime.setMinutes(endTime.getMinutes() + service.duration + (service.bufferMinutes || 0))

  // 3. Trouver un coiffeur disponible pour ce créneau
  const employees = await prisma.employee.findMany({
    where: { salonId, role: 'HAIRDRESSER' },
  })

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
    console.warn('[RDV_PARSER] Aucun coiffeur disponible pour ce créneau')
    return null
  }

  // 6. Vérifier qu'il n'existe pas déjà un RDV identique
  const existing = await prisma.appointment.findFirst({
    where: {
      salonId,
      clientId: conversation.clientId,
      serviceId: service.id,
      startTime,
      status: { in: ['SCHEDULED', 'PENDING', 'IN_PROGRESS'] },
    },
  })

  if (existing) {
    console.log('[RDV_PARSER] RDV identique déjà existant:', existing.id)
    return existing
  }

  // 7. Créer le rendez-vous en statut PENDING
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
      notes: rdv.notes || null,
    },
  })

  console.log(`[RDV_PARSER] ✅ RDV créé: ${appointment.id} — ${rdv.prestation} le ${rdv.creneau}`)

  return appointment
}

/**
 * Parse un créneau en texte libre vers une Date.
 * Supporte plusieurs formats :
 * - "2026-07-03T14:30:00" (ISO)
 * - "Jeudi 3 juillet à 14h30"
 * - "3 juillet 14:30"
 * - "03/07/2026 14:30"
 */
function parseCreneauToDate(creneau: string): Date | null {
  if (!creneau) return null

  // 1. Tenter le format ISO directement
  const isoDate = new Date(creneau)
  if (!isNaN(isoDate.getTime()) && creneau.includes('T')) {
    return isoDate
  }

  // 2. Tenter le format "DD/MM/YYYY HH:MM"
  const slashMatch = creneau.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2})[h:](\d{2})/)
  if (slashMatch) {
    const [, day, month, year, hour, minute] = slashMatch
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute))
  }

  // 3. Tenter le format français "X mois/month à HHhMM" ou "X mois HH:MM"
  const frMonths: Record<string, number> = {
    'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5,
    'juillet': 6, 'août': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11,
  }

  const frMatch = creneau.match(/(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)(?:\s+(\d{4}))?\s*(?:à\s*)?(\d{1,2})[h:](\d{2})/i)
  if (frMatch) {
    const [, day, monthName, yearStr, hour, minute] = frMatch
    const month = frMonths[monthName.toLowerCase()]
    const year = yearStr ? parseInt(yearStr) : new Date().getFullYear()
    if (month !== undefined) {
      return new Date(year, month, parseInt(day), parseInt(hour), parseInt(minute))
    }
  }

  // 4. Fallback : tenter un new Date() basique
  const fallback = new Date(creneau)
  if (!isNaN(fallback.getTime())) {
    return fallback
  }

  return null
}
