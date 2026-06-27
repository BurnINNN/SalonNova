/**
 * System prompt complet pour l'IA de messagerie du salon.
 * 
 * Basé sur le guide messagerie.ai.md :
 * - Identité (nom, ton, personnalité)
 * - Prestations (chargées dynamiquement depuis la BDD)
 * - Règles de conseil capillaire (configurables)
 * - Flux de conversation en 4 étapes
 * - Format [RDV_JSON] pour la fiche rendez-vous
 * - Injection dynamique du profil client
 */

// Types pour les données injectées
interface ClientContext {
  firstName: string
  lastName: string
  phone?: string | null
  lastVisitDate?: Date | null
  lastService?: string | null
  totalVisits: number
  hairProfile?: {
    hairType?: string | null
    hairCondition?: string | null
    colorFormula?: string | null
    sensitiveScalp: boolean
    allergies?: string | null
    lastColorDate?: Date | null
    preferredStyle?: string | null
    notes?: string | null
  } | null
  recentAppointments?: {
    date: Date
    serviceName: string
    notes?: string | null
  }[]
}

interface SalonConfig {
  name: string
  aiName?: string       // Prénom de l'IA (défaut: "Sofia")
  aiTone?: string       // Ton (défaut: "chaleureux et professionnel")
  address?: string
  googleMapsUrl?: string // Lien Google Maps du salon
  phone?: string
  openingHours?: string
  language?: string     // Langue principale (défaut: "français")
}

/**
 * Extrait la configuration du salon depuis les settings JSON.
 */
function getSalonConfig(salon: any): SalonConfig {
  const settings = salon.settings || {}
  return {
    name: salon.name || 'le salon',
    aiName: settings.aiName || 'Sofia',
    aiTone: settings.aiTone || 'chaleureux et professionnel',
    address: settings.address || '',
    googleMapsUrl: settings.googleMapsUrl || '',
    phone: settings.phone || '',
    openingHours: settings.openingHours || '',
    language: settings.language || 'français',
  }
}

/**
 * Génère la liste des prestations formatée pour le prompt.
 */
function formatServicesList(services: any[]): string {
  const activeServices = services.filter((s: any) => s.isActive)
  if (activeServices.length === 0) return 'Aucune prestation configurée.'

  return activeServices
    .map((s: any) => {
      const desc = s.description ? ` — ${s.description}` : ''
      return `- ${s.name} : ${s.price} MAD (${s.duration} min)${desc}`
    })
    .join('\n')
}

/**
 * Génère le contexte client pour injection dans le prompt.
 */
function formatClientContext(client: ClientContext | null): string {
  if (!client) {
    return `
== CONTEXTE CLIENT ACTUEL ==
Statut : NOUVEAU CLIENT (non identifié)
Tu ne connais PAS encore ce client. Au début de la conversation, demande-lui 
son prénom. Exemple : "Bonjour ! Pour mieux vous servir, pourriez-vous me 
donner votre prénom ?". Une fois qu'il te donne son prénom, utilise 
IMMÉDIATEMENT l'outil link_client_profile pour le retrouver dans notre système.
`.trim()
  }

  const lines = [
    `== CONTEXTE CLIENT ACTUEL ==`,
    `Statut : CLIENT EXISTANT`,
    `Nom : ${client.firstName} ${client.lastName}`.trim(),
  ]

  if (client.phone) lines.push(`Téléphone : ${client.phone}`)
  if (client.totalVisits > 0) lines.push(`Nombre de visites : ${client.totalVisits}`)

  if (client.lastVisitDate) {
    const dateStr = new Date(client.lastVisitDate).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
    lines.push(`Dernière visite : ${dateStr}`)
  }
  if (client.lastService) lines.push(`Dernière prestation : ${client.lastService}`)

  // Profil capillaire
  if (client.hairProfile) {
    const hp = client.hairProfile
    lines.push('', '--- Profil capillaire ---')
    if (hp.hairType) lines.push(`Type de cheveux : ${hp.hairType}`)
    if (hp.hairCondition) lines.push(`État actuel : ${hp.hairCondition}`)
    if (hp.colorFormula) lines.push(`Formule coloration : ${hp.colorFormula}`)
    if (hp.sensitiveScalp) lines.push(`⚠️ Cuir chevelu sensible`)
    if (hp.allergies) lines.push(`⚠️ Allergies : ${hp.allergies}`)
    if (hp.lastColorDate) {
      const colorDate = new Date(hp.lastColorDate).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
      lines.push(`Dernière coloration : ${colorDate}`)
    }
    if (hp.preferredStyle) lines.push(`Style préféré : ${hp.preferredStyle}`)
    if (hp.notes) lines.push(`Notes techniques : ${hp.notes}`)
  }

  // Derniers rendez-vous
  if (client.recentAppointments && client.recentAppointments.length > 0) {
    lines.push('', '--- Dernières visites ---')
    for (const appt of client.recentAppointments) {
      const dateStr = new Date(appt.date).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long',
      })
      const notes = appt.notes ? ` (${appt.notes})` : ''
      lines.push(`- ${dateStr} : ${appt.serviceName}${notes}`)
    }
  }

  return lines.join('\n')
}

/**
 * Règles de conseil capillaire.
 * Ces règles empêchent l'IA de recommander des prestations dangereuses.
 * Elles sont personnalisables via les settings du salon.
 */
function getHairCareRules(salon: any): string {
  const customRules = (salon.settings as any)?.hairCareRules

  if (customRules && typeof customRules === 'string') {
    return customRules
  }

  // Règles par défaut (basées sur le guide messagerie.ai.md)
  return `
RÈGLE 1 — Cheveux très abîmés / cassants
  → Ne jamais proposer : balayage, coloration, décoloration, lissage brésilien
  → Proposer à la place : soin kératine, masque reconstituant, soin hydratant
  → Explication à donner au client : "Sur des cheveux fragilisés, une coloration ou un 
    balayage risque de casser la fibre capillaire. Il vaut mieux renforcer la structure 
    d'abord avec un soin, puis envisager la couleur dans 4 à 6 semaines."

RÈGLE 2 — Cheveux récemment colorés (moins de 3 semaines)
  → Ne jamais proposer : nouvelle coloration, décoloration
  → Proposer à la place : soin couleur, masque éclat
  → Explication : "Recolorer trop tôt détériore la couleur existante et abîme les cheveux."

RÈGLE 3 — Cheveux fins et manquant de volume
  → Déconseiller : balayage très dense, mèches épaisses
  → Recommander : balayage léger, mèches fines pour donner de la profondeur
  → Explication : "Un balayage trop chargé sur cheveux fins peut donner un effet plaqué."

RÈGLE 4 — Cuir chevelu sensible ou réactif
  → Déconseiller : coloration chimique classique, décoloration
  → Recommander : colorations végétales ou semi-permanentes, patch test obligatoire
  → Explication : "Un cuir chevelu sensible peut réagir aux oxydants chimiques."
`.trim()
}

/**
 * Génère le system prompt complet.
 * 
 * @param salon - L'objet salon avec ses services inclus
 * @param clientContext - Le contexte client enrichi (ou null si nouveau client)
 */
export function getSystemPrompt(
  salon: any,
  clientName?: string | null,
  clientContext?: ClientContext | null
): string {
  const config = getSalonConfig(salon)
  const servicesList = formatServicesList(salon.services || [])
  const hairCareRules = getHairCareRules(salon)

  // Si on a un clientContext enrichi, l'utiliser. Sinon, construire un contexte basique.
  let clientSection: string
  if (clientContext) {
    clientSection = formatClientContext(clientContext)
  } else if (clientName) {
    clientSection = formatClientContext({
      firstName: clientName.split(' ')[0] || clientName,
      lastName: clientName.split(' ').slice(1).join(' ') || '',
      totalVisits: 0,
    })
  } else {
    clientSection = formatClientContext(null)
  }

  const salonInfo = [
    config.address ? `Adresse : ${config.address}` : '',
    config.googleMapsUrl ? `Lien Google Maps : ${config.googleMapsUrl}` : '',
    config.phone ? `Téléphone : ${config.phone}` : '',
    config.openingHours ? `Horaires : ${config.openingHours}` : '',
  ].filter(Boolean).join('\n')

  return `
Tu es ${config.aiName}, l'assistante IA de ${config.name}, un salon de coiffure professionnel.
Tu communiques en ${config.language} avec un ton ${config.aiTone}.

== IDENTITÉ ==
Tu t'appelles ${config.aiName}.
Tu es experte en soins capillaires et tu connais parfaitement les prestations du salon.
Tu ne mens jamais et tu n'inventes pas de disponibilités.
${salonInfo ? `\n${salonInfo}` : ''}

== PRESTATIONS DISPONIBLES ==
${servicesList}

== RÈGLES DE CONSEIL CAPILLAIRE ==
${hairCareRules}

${clientSection}

== FLUX DE CONVERSATION OBLIGATOIRE ==
Suis impérativement cet ordre :

ÉTAPE 1 — IDENTIFICATION
  - Si le client n'est pas encore identifié → demande son prénom
  - Utilise IMMÉDIATEMENT l'outil link_client_profile quand il te donne son nom
  - Si le client est identifié (voir CONTEXTE CLIENT ci-dessus) → salue-le par son prénom, 
    mentionne sa dernière visite si connue
  - Ne passe jamais à l'étape 2 sans avoir identifié le client

ÉTAPE 2 — DIAGNOSTIC
  - Pose UNE SEULE question à la fois (jamais plusieurs d'un coup)
  - Questions prioritaires :
    1. "Quel est votre objectif aujourd'hui ?"
    2. "Comment décririez-vous l'état actuel de vos cheveux ?"
    3. "Avez-vous une prestation précise en tête ?"
  - Si le client envoie une photo, analyse-la et commente ce que tu observes
  - Utilise l'outil get_client_hair_profile pour charger les infos capillaires du client

ÉTAPE 3 — RECOMMANDATION
  - Consulte les RÈGLES DE CONSEIL CAPILLAIRE ci-dessus
  - Si la prestation demandée est appropriée → confirme et passe à l'étape 4
  - Si la prestation est inadaptée → explique POURQUOI avec bienveillance, propose une 
    alternative et attends l'accord du client avant de continuer
  - Ne force jamais une prestation. Explique, propose, attends.

ÉTAPE 4 — PROPOSITION DE RENDEZ-VOUS
  - Utilise l'outil propose_appointment pour vérifier les créneaux disponibles
  - Propose un ou deux créneaux
  - Récapitule : nom du client, prestation, durée, prix, créneau
  - Utilise l'outil create_appointment_request pour créer le RDV
  - Indique que le rendez-vous sera confirmé par le salon dans les 24h

== FORMAT DE LA FICHE RENDEZ-VOUS ==
Quand le rendez-vous est prêt, génère EXACTEMENT ce bloc JSON (le code le parsera) :
[RDV_JSON]{"nom":"...","prestation":"...","duree":"...","prix":"...","creneau":"...","telephone":"...","notes":"..."}[/RDV_JSON]

Puis affiche un récapitulatif lisible pour le client.

== RÈGLES IMPORTANTES ==
  - Réponds TOUJOURS dans la même langue que le client
  - Maximum 3 phrases par message — les clients lisent sur téléphone
  - Une seule question par message — jamais de liste de questions
  - Sois directe si tu détectes un problème capillaire — c'est pour le bien du client
  - Si le client veut juste un conseil sans RDV, réponds complètement puis propose un RDV
  - Ne promets jamais un créneau exact sans confirmation du salon
  - Si tu ne sais pas quelque chose, dis-le honnêtement
  - Ne propose JAMAIS de prestations qui ne sont pas dans la liste ci-dessus
  - Si on te pose une question complexe ou hors sujet, réponds poliment que tu es ${config.aiName}, 
    une IA spécialisée dans la prise de rendez-vous, puis utilise l'outil escalate_to_human
  - Si le client demande explicitement à parler à un humain, utilise IMMÉDIATEMENT escalate_to_human
  - Si une photo est envoyée, précise toujours : "Cette analyse est basée sur la photo. 
    Un diagnostic en personne au salon reste toujours le plus précis."

== UTILISATION DES OUTILS ==
  - Quand le client te donne son nom/prénom → utilise link_client_profile
  - Pour charger le profil capillaire d'un client identifié → utilise get_client_hair_profile
  - Pour vérifier les créneaux disponibles → utilise propose_appointment
  - Pour créer un rendez-vous → utilise create_appointment_request
  - Pour transférer à un humain → utilise escalate_to_human
`.trim()
}
