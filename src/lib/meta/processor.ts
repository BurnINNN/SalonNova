import { prisma } from '@/lib/prisma'
import { callLLM } from '@/lib/ai/llm'
import { processIncomingImage } from '@/lib/ai/image-handler'
import { hasRdvJson, parseAndCreateRdv } from '@/lib/ai/rdv-parser'
import { sendChannelMessage } from './send'

// ============================================================
// POINT D'ENTRÉE — Dispatche selon le type d'événement Meta
// ============================================================

export async function processMetaEvent(body: any) {
  try {
    if (body.object === 'instagram') {
      await processInstagramEvent(body)
    } else if (body.object === 'page') {
      await processMessengerEvent(body)
    } else if (body.object === 'whatsapp_business_account') {
      await processWhatsAppEvent(body)
    } else {
      console.log('[WEBHOOK] Type d\'événement non géré:', body.object)
    }
  } catch (error) {
    console.error('[WEBHOOK] Erreur de traitement:', error)
  }
}

// ============================================================
// INSTAGRAM
// ============================================================

async function processInstagramEvent(body: any) {
  const entry = body.entry?.[0]

  if (!entry?.messaging) return

  for (const event of entry.messaging) {
    const senderId = event.sender.id   // IGSID (Instagram Scoped ID)
    const recipientId = event.recipient.id

    // Trouver le salon via l'instagramPageId
    let salon = await prisma.salon.findFirst({
      where: {
        settings: {
          path: ['instagramPageId'],
          equals: recipientId,
        },
      },
    })

    if (!salon) {
      // Association automatique si salon unique (facilite le dev et évite les blocages)
      const salons = await prisma.salon.findMany()
      if (salons.length === 1) {
        salon = salons[0]
        const updatedSettings = {
          ...(salon.settings as any),
          instagramPageId: recipientId,
        }
        await prisma.salon.update({
          where: { id: salon.id },
          data: { settings: updatedSettings },
        })
        console.log(`[INSTAGRAM] Association automatique de l'ID de page ${recipientId} au salon unique ${salon.name}`)
      } else {
        console.log('[INSTAGRAM] Aucun salon configuré pour cet ID:', recipientId)
        continue
      }
    }

    // Instagram : on ne peut pas auto-lier (ID opaque)
    const client = await prisma.client.findFirst({
      where: {
        salonId: salon.id,
        instagramId: senderId,
      },
    })

    // Extraire le texte et l'image éventuelle
    let messageText = ''
    let imageUrl: string | null = null

    if (event.message?.text) {
      messageText = event.message.text
    }
    if (event.message?.attachments?.[0]?.type === 'image') {
      imageUrl = event.message.attachments[0].payload?.url || null
      if (!messageText) messageText = 'Voici une photo de mes cheveux'
    }

    if (!messageText && !imageUrl) continue

    await handleIncomingMessage({
      salonId: salon.id,
      channel: 'INSTAGRAM',
      externalId: senderId,
      messageText,
      externalMessageId: event.message?.mid,
      clientId: client?.id || null,
      imageUrl,
    })
  }
}

// ============================================================
// MESSENGER
// ============================================================

async function processMessengerEvent(body: any) {
  const entry = body.entry?.[0]

  if (!entry?.messaging) return

  for (const event of entry.messaging) {
    const senderId = event.sender.id   // PSID (Page Scoped ID)
    const recipientId = event.recipient.id

    // Trouver le salon via le messengerPageId
    let salon = await prisma.salon.findFirst({
      where: {
        settings: {
          path: ['messengerPageId'],
          equals: recipientId,
        },
      },
    })

    if (!salon) {
      // Association automatique si salon unique (facilite le dev et évite les blocages)
      const salons = await prisma.salon.findMany()
      if (salons.length === 1) {
        salon = salons[0]
        const updatedSettings = {
          ...(salon.settings as any),
          messengerPageId: recipientId,
        }
        await prisma.salon.update({
          where: { id: salon.id },
          data: { settings: updatedSettings },
        })
        console.log(`[MESSENGER] Association automatique de l'ID de page ${recipientId} au salon unique ${salon.name}`)
      } else {
        console.log('[MESSENGER] Aucun salon configuré pour cette Page:', recipientId)
        continue
      }
    }

    // Messenger : ID opaque, comme Instagram
    const client = await prisma.client.findFirst({
      where: {
        salonId: salon.id,
        messengerId: senderId,
      },
    })

    // Extraire le texte et l'image éventuelle
    let messageText = ''
    let imageUrl: string | null = null

    if (event.message?.text) {
      messageText = event.message.text
    }
    if (event.message?.attachments?.[0]?.type === 'image') {
      imageUrl = event.message.attachments[0].payload?.url || null
      if (!messageText) messageText = 'Voici une photo de mes cheveux'
    }

    if (!messageText && !imageUrl) continue

    await handleIncomingMessage({
      salonId: salon.id,
      channel: 'MESSENGER',
      externalId: senderId,
      messageText,
      externalMessageId: event.message?.mid,
      clientId: client?.id || null,
      imageUrl,
    })
  }
}

// ============================================================
// WHATSAPP (OFFICIEL CLOUD API)
// ============================================================

async function processWhatsAppEvent(body: any) {
  const entry = body.entry?.[0]
  const changes = entry?.changes?.[0]
  if (changes?.field !== 'messages') return

  const value = changes.value
  const message = value?.messages?.[0]
  if (!message) return

  const senderPhone = message.from
  const contactName = value?.contacts?.[0]?.profile?.name || 'Client'
  const messageId = message.id
  const recipientPhoneId = value?.metadata?.phone_number_id

  // Trouver le salon via le whatsappPhoneNumberId
  let salon = await prisma.salon.findFirst({
    where: {
      settings: {
        path: ['whatsappPhoneNumberId'],
        equals: recipientPhoneId,
      },
    },
  })

  if (!salon) {
    // Association automatique si salon unique (facilite le dev et évite les blocages)
    const salons = await prisma.salon.findMany()
    if (salons.length === 1) {
      salon = salons[0]
      const updatedSettings = {
        ...(salon.settings as any),
        whatsappPhoneNumberId: recipientPhoneId,
      }
      await prisma.salon.update({
        where: { id: salon.id },
        data: { settings: updatedSettings },
      })
      console.log(`[WHATSAPP OFFICIEL] Association automatique du phone_number_id ${recipientPhoneId} au salon unique ${salon.name}`)
    } else {
      console.log('[WHATSAPP OFFICIEL] Aucun salon configuré pour ce phone_number_id:', recipientPhoneId)
      return
    }
  }

  // Trouver ou créer le client
  let client = await prisma.client.findFirst({
    where: {
      salonId: salon.id,
      OR: [
        { whatsappId: senderPhone },
        { phone: senderPhone },
        { phone: '+' + senderPhone },
      ],
    },
  })

  if (!client) {
    client = await prisma.client.create({
      data: {
        salonId: salon.id,
        whatsappId: senderPhone,
        phone: '+' + senderPhone,
        firstName: contactName,
        lastName: '',
      },
    })
  } else if (!client.whatsappId) {
    await prisma.client.update({
      where: { id: client.id },
      data: { whatsappId: senderPhone },
    })
  }

  // Extraire le texte et l'image
  let messageText = ''
  let imageMediaId: string | null = null

  if (message.type === 'text') {
    messageText = message.text?.body || ''
  } else if (message.type === 'image') {
    imageMediaId = message.image?.id || null
    messageText = message.image?.caption || 'Voici une photo de mes cheveux'
  } else {
    console.log('[WHATSAPP OFFICIEL] Type de message non supporté dans le processeur:', message.type)
    return
  }

  if (!messageText && !imageMediaId) return

  await handleIncomingMessage({
    salonId: salon.id,
    channel: 'WHATSAPP',
    externalId: senderPhone,
    messageText,
    externalMessageId: messageId,
    clientId: client.id,
    phoneNumberId: recipientPhoneId,
    imageMediaId,
  })
}


// ============================================================
// TRAITEMENT COMMUN — Cœur de la logique
// ============================================================

interface IncomingMessageParams {
  salonId: string
  channel: 'WHATSAPP' | 'INSTAGRAM' | 'MESSENGER'
  externalId: string
  messageText: string
  externalMessageId?: string
  clientId: string | null
  phoneNumberId?: string  // WhatsApp uniquement
  imageMediaId?: string | null   // WhatsApp : media_id
  imageUrl?: string | null       // Instagram/Messenger : URL directe
}

async function handleIncomingMessage(params: IncomingMessageParams) {
  const { salonId, channel, externalId, messageText, externalMessageId, clientId, phoneNumberId, imageMediaId, imageUrl } = params

  // 1. Trouver ou créer la conversation
  let conversation = await prisma.conversation.findFirst({
    where: {
      externalId,
      channel,
      salonId,
      status: { not: 'RESOLVED' },  // Ignorer les conversations résolues
    },
    orderBy: { updatedAt: 'desc' },
  })

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        salonId,
        channel,
        externalId,
        clientId,
        status: 'HUMAN',
      },
    })
  } else if (clientId && !conversation.clientId) {
    // Mettre à jour le clientId si on l'a trouvé et qu'il n'est pas encore lié
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { clientId },
    })
  }

  // 2. Enregistrer le message entrant
  const savedMessageContent = imageMediaId || imageUrl
    ? `📷 ${messageText}`
    : messageText

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      content: savedMessageContent,
      role: 'USER',
      externalId: externalMessageId,
    },
  })

  // 3. Mettre à jour le timestamp de la conversation
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  })

  // 4. Si la conversation est gérée par le bot, appeler l'IA
  if (conversation.status === 'BOT') {
    try {
      // 4a. Traiter l'image si présente
      let imageData = null
      if (imageMediaId) {
        // WhatsApp : media_id → télécharger via Graph API
        imageData = await processIncomingImage(imageMediaId, channel)
        if (imageData) {
          console.log(`[AI] 📷 Image WhatsApp traitée: ${imageData.originalSizeBytes}B → ${imageData.compressedSizeBytes}B`)
        }
      } else if (imageUrl) {
        // Instagram/Messenger : URL directe
        imageData = await processIncomingImage(imageUrl, channel)
        if (imageData) {
          console.log(`[AI] 📷 Image ${channel} traitée: ${imageData.originalSizeBytes}B → ${imageData.compressedSizeBytes}B`)
        }
      }

      // 4b. Appeler le LLM avec l'image (ou sans)
      const llmResponse = await callLLM(
        salonId,
        conversation.id,
        messageText,
        { channel, externalId },
        imageData ? { base64: imageData.base64, mediaType: imageData.mediaType } : null
      )

      if (llmResponse.text) {
        // 4c. Vérifier si la réponse contient un [RDV_JSON]
        let finalText = llmResponse.text
        if (hasRdvJson(llmResponse.text)) {
          const rdvResult = await parseAndCreateRdv(
            llmResponse.text,
            salonId,
            conversation.id
          )
          finalText = rdvResult.cleanedText

          if (rdvResult.appointmentCreated) {
            console.log(`[AI] ✅ RDV créé automatiquement: ${rdvResult.appointmentId}`)
          } else if (rdvResult.error) {
            console.warn(`[AI] ⚠️ RDV_JSON détecté mais non créé: ${rdvResult.error}`)
          }
        }

        // 4d. Enregistrer la réponse IA
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            content: finalText,
            role: 'ASSISTANT',
          },
        })

        // 4e. Envoyer la réponse via le bon canal
        await sendChannelMessage(channel, externalId, finalText, phoneNumberId)
      }

      // Log des tools exécutés
      if (llmResponse.toolsExecuted.length > 0) {
        console.log(`[AI] Tools exécutés pour conv ${conversation.id}:`,
          llmResponse.toolsExecuted.map(t => t.name).join(', '))
      }
    } catch (error) {
      console.error(`[AI] Erreur lors du traitement IA pour conv ${conversation.id}:`, error)

      // Envoyer un message d'erreur au client
      const errorMsg = "Désolé, j'ai rencontré un petit souci technique. Un membre de notre équipe va vous répondre rapidement ! 😊"
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          content: errorMsg,
          role: 'ASSISTANT',
        },
      })
      await sendChannelMessage(channel, externalId, errorMsg, phoneNumberId)

      // Escalader automatiquement à un humain en cas d'erreur
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { status: 'HUMAN' },
      })
    }
  }
  // Si status HUMAN → le message est juste enregistré, le gérant le verra dans l'inbox
}
