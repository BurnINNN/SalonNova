import { prisma } from '@/lib/prisma'
import { callLLM } from '@/lib/ai/llm'
import { compressAndConvertImage } from '@/lib/ai/image-handler'
import { hasRdvJson, parseAndCreateRdv } from '@/lib/ai/rdv-parser'
import { sendChannelMessage } from '@/lib/meta/send'

const GATEWAY_URL = process.env.WHATSAPP_GATEWAY_URL
const API_KEY = process.env.WHATSAPP_GATEWAY_API_KEY

/**
 * Télécharge et décode l'image depuis la passerelle Evolution API, puis la compresse.
 */
export async function downloadEvolutionImage(
  instanceName: string,
  messageId: string
): Promise<{ base64: string; mediaType: string } | null> {
  if (!GATEWAY_URL || !API_KEY) return null

  try {
    const url = `${GATEWAY_URL}/chat/getBase64FromMediaMessage/${instanceName}`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          key: {
            id: messageId,
          },
        },
        convertToMp4: false,
      }),
    })

    if (!response.ok) {
      console.error('[WHATSAPP IMAGE] Erreur récupération Base64:', await response.text())
      return null
    }

    const resData = await response.json()
    if (!resData.base64) return null

    let base64Str = resData.base64
    let mediaType = resData.mimetype || 'image/jpeg'

    // Si le base64 est préfixé par le schéma data URI
    if (base64Str.startsWith('data:')) {
      const parts = base64Str.split(';base64,')
      if (parts.length === 2) {
        mediaType = parts[0].replace('data:', '')
        base64Str = parts[1]
      }
    }

    // Compresser l'image pour optimiser les coûts et le contexte Gemini
    const buffer = Buffer.from(base64Str, 'base64')
    const compressed = await compressAndConvertImage(buffer)

    if (compressed) {
      return {
        base64: compressed.base64,
        mediaType: compressed.mediaType,
      }
    }

    return {
      base64: base64Str,
      mediaType,
    }
  } catch (error) {
    console.error('[WHATSAPP IMAGE] Erreur téléchargement/décompression:', error)
    return null
  }
}

/**
 * Traite un message WhatsApp entrant reçu depuis Evolution API.
 */
export async function handleEvolutionIncomingMessage(instanceName: string, data: any) {
  try {
    const key = data.key
    const remoteJid = key.remoteJid
    const senderPhone = remoteJid.split('@')[0]
    const contactName = data.pushName || 'Client'

    // 1. Routage dynamique multi-salons pour numéro partagé :
    // Chercher d'abord si le numéro de téléphone correspond à un client déjà enregistré dans un salon
    let salon = null;
    const clientRecord = await prisma.client.findFirst({
      where: {
        OR: [
          { whatsappId: senderPhone },
          { phone: senderPhone },
          { phone: '+' + senderPhone },
        ],
      },
      include: {
        salon: true,
      },
    });

    if (clientRecord && clientRecord.salon) {
      salon = clientRecord.salon;
      console.log(`[WHATSAPP ROUTING] Client reconnu (${senderPhone}). Routage vers le salon : ${salon.name}`);
    } else {
      // Si le client n'est pas encore connu, on cherche le salon associé à cette instance par défaut
      salon = await prisma.salon.findFirst({
        where: {
          settings: {
            path: ['whatsappInstanceName'],
            equals: instanceName,
          },
        },
      });

      if (!salon) {
        // Mode développement / fallback mono-salon
        const salons = await prisma.salon.findMany();
        if (salons.length === 1) {
          salon = salons[0];
        } else {
          salon = salons.find(s => s.name === 'BeColor' || s.slug === 'salon-pro') || null;
        }

        if (salon) {
          const updatedSettings = {
            ...(salon.settings as any),
            whatsappInstanceName: instanceName,
          };
          await prisma.salon.update({
            where: { id: salon.id },
            data: { settings: updatedSettings },
          });
          console.log(`[WHATSAPP] Association automatique de l'instance ${instanceName} au salon ${salon.name}`);
        }
      }

      if (!salon) {
        console.log('[WHATSAPP] Aucun salon trouvé pour router ce message :', instanceName);
        return;
      }
      
      console.log(`[WHATSAPP ROUTING] Nouveau client (${senderPhone}). Routage par défaut vers le salon : ${salon.name}`);
    }

    // 2. Trouver ou créer le client
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

    // 3. Extraire le contenu textuel et d'image
    let messageText = ''
    let isImage = false
    const messageId = key.id

    const messageObj = data.message
    if (!messageObj) return

    if (messageObj.conversation) {
      messageText = messageObj.conversation
    } else if (messageObj.extendedTextMessage?.text) {
      messageText = messageObj.extendedTextMessage.text
    } else if (messageObj.imageMessage) {
      isImage = true
      messageText = messageObj.imageMessage.caption || 'Voici une photo de mes cheveux'
    } else {
      console.log('[WHATSAPP] Type de message non supporté dans le processeur:', data.messageType)
      return
    }

    // 4. Trouver ou créer la conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        externalId: senderPhone,
        channel: 'WHATSAPP',
        salonId: salon.id,
        status: { not: 'RESOLVED' },
      },
      orderBy: { updatedAt: 'desc' },
    })

    if (!conversation) {
      const defaultStatus = (process.env.DEFAULT_CONVERSATION_STATUS as any) || 'HUMAN'
      conversation = await prisma.conversation.create({
        data: {
          salonId: salon.id,
          channel: 'WHATSAPP',
          externalId: senderPhone,
          clientId: client.id,
          status: defaultStatus,
        },
      })
    } else if (!conversation.clientId) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { clientId: client.id },
      })
    }

    // Enregistrer le message de l'utilisateur
    const savedMessageContent = isImage ? `📷 ${messageText}` : messageText
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        content: savedMessageContent,
        role: 'USER',
        externalId: messageId,
      },
    })

    // Mettre à jour la date d'activité de la conversation
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    })

    const settings = (salon.settings as any) || {}
    const isAiEnabledGlobally = settings.aiEnabled !== false
    const isAiEnabledForClient = client.aiEnabled !== false

    // 5. Appeler l'IA si en mode BOT et activé globalement + pour le client
    if (conversation.status === 'BOT' && isAiEnabledGlobally && isAiEnabledForClient) {
      try {
        let imageData = null
        if (isImage) {
          console.log(`[WHATSAPP] Téléchargement de l'image ${messageId}...`)
          imageData = await downloadEvolutionImage(instanceName, messageId)
        }

        const llmResponse = await callLLM(
          salon.id,
          conversation.id,
          messageText,
          { channel: 'WHATSAPP', externalId: senderPhone },
          imageData ? { base64: imageData.base64, mediaType: imageData.mediaType as any } : null
        )

        if (llmResponse.text) {
          let finalText = llmResponse.text

          // Traiter les réservations automatiques
          if (hasRdvJson(llmResponse.text)) {
            const rdvResult = await parseAndCreateRdv(
              llmResponse.text,
              salon.id,
              conversation.id
            )
            finalText = rdvResult.cleanedText

            if (rdvResult.appointmentCreated) {
              console.log(`[WHATSAPP IA] ✅ RDV créé automatiquement: ${rdvResult.appointmentId}`)
            } else if (rdvResult.error) {
              console.warn(`[WHATSAPP IA] ⚠️ RDV_JSON détecté mais non créé: ${rdvResult.error}`)
            }
          }

          // Enregistrer la réponse
          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              content: finalText,
              role: 'ASSISTANT',
            },
          })

          // Répondre au client
          await sendChannelMessage('WHATSAPP', senderPhone, finalText, instanceName)
        }
      } catch (error) {
        console.error(`[WHATSAPP IA] Erreur lors du traitement IA pour conv ${conversation.id}:`, error)

        const errorMsg = "Désolé, j'ai rencontré un petit souci technique. Un membre de notre équipe va vous répondre rapidement ! 😊"
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            content: errorMsg,
            role: 'ASSISTANT',
          },
        })
        
        await sendChannelMessage('WHATSAPP', senderPhone, errorMsg, instanceName)

        // Escalader au gérant en cas d'erreur
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { status: 'HUMAN' },
        })
      }
    }
  } catch (err) {
    console.error('[WHATSAPP PROCESSOR] Erreur critique:', err)
  }
}
