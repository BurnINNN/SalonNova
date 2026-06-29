import { GoogleGenerativeAI } from '@google/generative-ai'
import { prisma } from '@/lib/prisma'
import { getSystemPrompt } from './prompts'
import { getGeminiTools, executeToolCall } from './tools'

// Initialisation lazy de Gemini
let _gemini: GoogleGenerativeAI | null = null

function getGemini() {
  if (!_gemini) _gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
  return _gemini
}

// Nombre max d'itérations de tool calling pour éviter les boucles infinies
const MAX_TOOL_ITERATIONS = 5

export interface LLMResponse {
  text: string
  toolsExecuted: { name: string; result: any }[]
}

interface ToolContext {
  salonId: string
  conversationId: string
  channel: string
  externalId: string
}

interface ImageData {
  base64: string
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
}

/**
 * Charge le contexte client enrichi (profil capillaire + derniers RDV)
 * pour injection dans le system prompt.
 */
async function loadClientContext(clientId: string | null) {
  if (!clientId) return null

  const client = await prisma.client.findUnique({
    where: { id: clientId },
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

  if (!client) return null

  const lastAppointment = client.appointments[0]

  return {
    firstName: client.firstName,
    lastName: client.lastName,
    phone: client.phone,
    lastVisitDate: lastAppointment?.startTime || null,
    lastService: lastAppointment?.service?.name || null,
    totalVisits: client.appointments.length,
    hairProfile: client.hairProfile ? {
      hairType: client.hairProfile.hairType,
      hairCondition: client.hairProfile.hairCondition,
      colorFormula: client.hairProfile.colorFormula,
      sensitiveScalp: client.hairProfile.sensitiveScalp,
      allergies: client.hairProfile.allergies,
      lastColorDate: client.hairProfile.lastColorDate,
      preferredStyle: client.hairProfile.preferredStyle,
      notes: client.hairProfile.notes,
    } : null,
    recentAppointments: client.appointments.map((a) => ({
      date: a.startTime,
      serviceName: a.service?.name || 'Prestation inconnue',
      notes: a.notes,
    })),
  }
}

/**
 * Appelle le LLM (Gemini) avec support du tool calling.
 * Boucle jusqu'à obtenir une réponse texte finale (ou MAX_TOOL_ITERATIONS atteint).
 */
export async function callLLM(
  salonId: string,
  conversationId: string,
  userMessage: string,
  toolContext?: { channel: string; externalId: string },
  imageData?: ImageData | null
): Promise<LLMResponse> {
  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    include: { services: true },
  })

  if (!salon) throw new Error('Salon introuvable')

  // Récupérer la conversation pour connaître le client lié
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { client: true },
  })

  // Charger le contexte client enrichi (profil capillaire + RDV)
  const clientContext = await loadClientContext(conversation?.clientId || null)

  const clientName = conversation?.client
    ? `${conversation.client.firstName} ${conversation.client.lastName}`.trim()
    : null

  // Récupérer l'historique récent (20 derniers messages, sans les SYSTEM)
  const history = await prisma.message.findMany({
    where: {
      conversationId,
      role: { not: 'SYSTEM' },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  const formattedHistory = history.reverse().map((m) => ({
    role: m.role === 'USER' ? ('user' as const) : ('assistant' as const),
    content: m.content,
  }))

  const systemPrompt = getSystemPrompt(salon, clientName, clientContext)

  const ctx: ToolContext = {
    salonId,
    conversationId,
    channel: toolContext?.channel || conversation?.channel || 'WHATSAPP',
    externalId: toolContext?.externalId || conversation?.externalId || '',
  }

  // Toujours utiliser Gemini comme moteur IA
  return callGeminiWithTools(systemPrompt, formattedHistory, userMessage, ctx, imageData)
}

// ============================================================
// GEMINI — Tool Calling Loop
// ============================================================

async function callGeminiWithTools(
  systemPrompt: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  userMessage: string,
  ctx: ToolContext,
  imageData?: ImageData | null
): Promise<LLMResponse> {
  const tools = getGeminiTools()
  const toolsExecuted: { name: string; result: any }[] = []

  const model = getGemini().getGenerativeModel({
    model: 'gemini-1.5-pro',
    systemInstruction: systemPrompt,
    tools: tools as any,
  })

  // Convertir l'historique au format Gemini
  const geminiHistory = history.map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }))

  const chat = model.startChat({
    history: geminiHistory,
    generationConfig: {
      maxOutputTokens: 600,
      temperature: 0.3,
    },
  })

  // Préparer le message utilisateur
  const userParts: any[] = []
  if (imageData) {
    userParts.push({
      inlineData: {
        data: imageData.base64,
        mimeType: imageData.mediaType,
      },
    })
  }
  userParts.push({ text: userMessage })

  let currentResponse = await chat.sendMessage(userParts)

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const responseText = currentResponse.response.text()
    
    // Obtenir les appels d'outils s'il y en a
    const functionCalls = currentResponse.response.functionCalls()

    if (!functionCalls || functionCalls.length === 0) {
      return {
        text: responseText || "Je suis désolé, je n'ai pas pu générer une réponse.",
        toolsExecuted,
      }
    }

    const functionResponses: any[] = []

    for (const call of functionCalls) {
      const args = call.args as any
      const result = await executeToolCall(call.name, args, ctx)
      
      toolsExecuted.push({ name: call.name, result })

      functionResponses.push({
        functionResponse: {
          name: call.name,
          response: result,
        },
      })
    }

    // Renvoyer les résultats des outils au modèle
    currentResponse = await chat.sendMessage(functionResponses)
  }

  return {
    text: "Je m'excuse, j'ai rencontré un petit souci. Un membre de l'équipe va prendre le relais sous peu ! 😊",
    toolsExecuted,
  }
}
