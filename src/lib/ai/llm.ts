// Imports statiques uniquement pour les dépendances qui ne valident pas les clés API à l'import
import { GoogleGenerativeAI } from '@google/generative-ai'
import { prisma } from '@/lib/prisma'
import { getSystemPrompt } from './prompts'
import { getOpenAITools, getAnthropicTools, getGeminiTools, executeToolCall } from './tools'

// Imports de TYPE uniquement (éliminés au build, n'importent pas le code runtime des SDKs)
import type Anthropic from '@anthropic-ai/sdk'
import type OpenAI from 'openai'

// Initialisation lazy + import dynamique pour OpenAI et Anthropic
// Ces SDKs valident la présence des clés API à l'import du module,
// ce qui fait échouer `next build` si les clés ne sont pas définies.
let _anthropic: Anthropic | null = null
let _openai: OpenAI | null = null
let _gemini: GoogleGenerativeAI | null = null

async function getAnthropic(): Promise<Anthropic> {
  if (!_anthropic) {
    const { default: AnthropicSDK } = await import('@anthropic-ai/sdk')
    _anthropic = new AnthropicSDK({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _anthropic
}

async function getOpenAI(): Promise<OpenAI> {
  if (!_openai) {
    const { default: OpenAISDK } = await import('openai')
    _openai = new OpenAISDK({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openai
}

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
 * Appelle le LLM avec support du tool calling.
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
  const provider = (salon.settings as any)?.llmProvider || 'openai'

  const ctx: ToolContext = {
    salonId,
    conversationId,
    channel: toolContext?.channel || conversation?.channel || 'WHATSAPP',
    externalId: toolContext?.externalId || conversation?.externalId || '',
  }

  if (provider === 'anthropic') {
    return callAnthropicWithTools(systemPrompt, formattedHistory, userMessage, ctx, imageData)
  } else if (provider === 'gemini') {
    return callGeminiWithTools(systemPrompt, formattedHistory, userMessage, ctx, imageData)
  } else {
    return callOpenAIWithTools(systemPrompt, formattedHistory, userMessage, ctx, imageData)
  }
}

// ============================================================
// OPENAI — Tool Calling Loop
// ============================================================

async function callOpenAIWithTools(
  systemPrompt: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  userMessage: string,
  ctx: ToolContext,
  imageData?: ImageData | null
): Promise<LLMResponse> {
  const tools = getOpenAITools()
  const toolsExecuted: { name: string; result: any }[] = []

  // Construire le message utilisateur (avec ou sans image)
  let userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] | string
  if (imageData) {
    userContent = [
      {
        type: 'image_url',
        image_url: {
          url: `data:${imageData.mediaType};base64,${imageData.base64}`,
          detail: 'low', // "low" pour réduire les tokens
        },
      },
      { type: 'text', text: userMessage },
    ]
  } else {
    userContent = userMessage
  }

  // Construire les messages initiaux
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userContent },
  ]

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const openai = await getOpenAI()
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      tools,
      max_tokens: 600,
      temperature: 0.3,
    })

    const choice = response.choices[0]

    // Si pas de tool call → réponse texte finale
    if (choice.finish_reason !== 'tool_calls' || !choice.message.tool_calls?.length) {
      return {
        text: choice.message.content || "Je suis désolé, je n'ai pas pu générer une réponse.",
        toolsExecuted,
      }
    }

    // Ajouter le message assistant avec les tool calls
    messages.push(choice.message)

    // Exécuter chaque tool call
    for (const toolCall of choice.message.tool_calls) {
      const fn = (toolCall as any).function
      const args = JSON.parse(fn.arguments)
      const result = await executeToolCall(fn.name, args, ctx)

      toolsExecuted.push({ name: fn.name, result })

      // Ajouter le résultat du tool au messages
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      })
    }
    // La boucle continue : le LLM verra le résultat du tool et générera une réponse
  }

  // Sécurité : si on dépasse MAX_TOOL_ITERATIONS
  return {
    text: "Je m'excuse, j'ai rencontré un petit souci. Un membre de l'équipe va prendre le relais sous peu ! 😊",
    toolsExecuted,
  }
}

// ============================================================
// ANTHROPIC — Tool Calling Loop (avec Prompt Caching)
// ============================================================

async function callAnthropicWithTools(
  systemPrompt: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  userMessage: string,
  ctx: ToolContext,
  imageData?: ImageData | null
): Promise<LLMResponse> {
  const tools = getAnthropicTools()
  const toolsExecuted: { name: string; result: any }[] = []

  // Construire le message utilisateur (avec ou sans image)
  let userContent: Anthropic.ContentBlockParam[]
  if (imageData) {
    userContent = [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: imageData.mediaType,
          data: imageData.base64,
        },
      },
      { type: 'text', text: userMessage },
    ]
  } else {
    userContent = [{ type: 'text', text: userMessage }]
  }

  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: 'user', content: userContent },
  ]

  // System prompt avec prompt caching (réduit les coûts de ~90% sur le prompt)
  const systemWithCache: Anthropic.TextBlockParam[] = [
    {
      type: 'text',
      text: systemPrompt,
      cache_control: { type: 'ephemeral' },
    } as any,
  ]

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const anthropic = await getAnthropic()
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      system: systemWithCache,
      messages,
      tools: tools as any,
      max_tokens: 600,
      temperature: 0.3,
    })

    // Chercher les blocs texte et tool_use dans la réponse
    const textBlocks = response.content.filter((b) => b.type === 'text')
    const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use')

    // Si pas de tool_use → réponse texte finale
    if (toolUseBlocks.length === 0) {
      const text = textBlocks.map((b: any) => b.text).join('') ||
        "Je suis désolé, je n'ai pas pu générer une réponse."
      return { text, toolsExecuted }
    }

    // Ajouter la réponse assistant au messages
    messages.push({ role: 'assistant', content: response.content as any })

    // Exécuter chaque tool_use et construire les résultats
    const toolResults: Anthropic.ToolResultBlockParam[] = []
    for (const block of toolUseBlocks) {
      const toolBlock = block as Anthropic.ToolUseBlock
      const result = await executeToolCall(toolBlock.name, toolBlock.input, ctx)

      toolsExecuted.push({ name: toolBlock.name, result })

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolBlock.id,
        content: JSON.stringify(result),
      })
    }

    // Ajouter les résultats des tools
    messages.push({ role: 'user', content: toolResults })

    // Si le stop_reason est 'end_turn' et il y avait du texte, on a fini
    if (response.stop_reason === 'end_turn' && textBlocks.length > 0) {
      const text = textBlocks.map((b: any) => b.text).join('')
      return { text, toolsExecuted }
    }
  }

  return {
    text: "Je m'excuse, j'ai rencontré un petit souci. Un membre de l'équipe va prendre le relais sous peu ! 😊",
    toolsExecuted,
  }
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
