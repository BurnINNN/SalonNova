import { sendWhatsAppEvolutionMessage } from '../whatsapp/send'

const META_GRAPH_API = 'https://graph.facebook.com/v19.0'

/**
 * Envoie un message sur le bon canal (WhatsApp officiel/Evolution API, Instagram/Messenger via Meta API).
 */
export async function sendChannelMessage(
  channel: string,
  recipientId: string,
  text: string,
  whatsappInstanceName?: string
) {
  switch (channel) {
    case 'WHATSAPP':
      if (process.env.WHATSAPP_PHONE_NUMBER_ID) {
        return sendWhatsAppCloudMessage(recipientId, text)
      }
      return sendWhatsAppEvolutionMessage(whatsappInstanceName || 'salon_default', recipientId, text)
    case 'INSTAGRAM':
      return sendInstagramMessage(recipientId, text)
    case 'MESSENGER':
      return sendMessengerMessage(recipientId, text)
    default:
      throw new Error(`Canal non supporté: ${channel}`)
  }
}

/**
 * Envoie un message officiel WhatsApp Cloud API (Meta).
 */
export async function sendWhatsAppCloudMessage(recipientPhone: string, text: string) {
  const token = process.env.META_ACCESS_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID

  if (!token || !phoneId) {
    console.log(`\n📨 [MOCK WHATSAPP OFFICIEL] → ${recipientPhone}`)
    console.log(`   Message: ${text}\n`)
    return { mock: true, messageId: `mock_${Date.now()}` }
  }

  // Garder uniquement les chiffres pour WhatsApp officiel
  const cleanNumber = recipientPhone.replace(/[^\d]/g, '')
  const url = `${META_GRAPH_API}/${phoneId}/messages`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanNumber,
      type: 'text',
      text: {
        preview_url: false,
        body: text,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('[META API] Erreur WhatsApp Cloud API:', error)
    throw new Error(`Échec de l'envoi WhatsApp officiel: ${JSON.stringify(error)}`)
  }

  return response.json()
}

/**
 * Envoie un message Instagram via la Send API (Messenger Platform).
 */
export async function sendInstagramMessage(recipientId: string, text: string) {
  const token = process.env.META_ACCESS_TOKEN
  if (!token) {
    console.log(`\n📨 [MOCK INSTAGRAM] → ${recipientId}`)
    console.log(`   Message: ${text}\n`)
    return { mock: true, messageId: `mock_${Date.now()}` }
  }

  const url = `${META_GRAPH_API}/me/messages`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('[META API] Erreur Instagram:', error)
    throw new Error("Échec de l'envoi Instagram")
  }

  return response.json()
}

/**
 * Envoie un message Facebook Messenger via la Send API.
 */
export async function sendMessengerMessage(recipientId: string, text: string) {
  const token = process.env.META_ACCESS_TOKEN
  if (!token) {
    console.log(`\n📨 [MOCK MESSENGER] → ${recipientId}`)
    console.log(`   Message: ${text}\n`)
    return { mock: true, messageId: `mock_${Date.now()}` }
  }

  const url = `${META_GRAPH_API}/me/messages`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('[META API] Erreur Messenger:', error)
    throw new Error("Échec de l'envoi Messenger")
  }

  return response.json()
}

