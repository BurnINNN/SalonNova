const META_GRAPH_API = 'https://graph.facebook.com/v19.0'

/**
 * Envoie un message sur le bon canal Meta.
 * En mode mock (pas de META_ACCESS_TOKEN), log en console uniquement.
 */
export async function sendChannelMessage(
  channel: string,
  recipientId: string,
  text: string,
  phoneNumberId?: string
) {
  const token = process.env.META_ACCESS_TOKEN

  // Mode mock si pas de token configuré
  if (!token) {
    console.log(`\n📨 [MOCK ${channel}] → ${recipientId}`)
    console.log(`   Message: ${text}`)
    console.log(`   (Configurez META_ACCESS_TOKEN pour envoyer réellement)\n`)
    return { mock: true, messageId: `mock_${Date.now()}` }
  }

  switch (channel) {
    case 'WHATSAPP':
      return sendWhatsAppMessage(phoneNumberId!, recipientId, text)
    case 'INSTAGRAM':
      return sendInstagramMessage(recipientId, text)
    case 'MESSENGER':
      return sendMessengerMessage(recipientId, text)
    default:
      throw new Error(`Canal non supporté: ${channel}`)
  }
}

/**
 * Envoie un message WhatsApp via la Cloud API.
 */
export async function sendWhatsAppMessage(
  phoneNumberId: string,
  to: string,
  text: string
) {
  const token = process.env.META_ACCESS_TOKEN
  const url = `${META_GRAPH_API}/${phoneNumberId}/messages`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: to,
      type: 'text',
      text: { body: text },
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('[META API] Erreur WhatsApp:', error)
    throw new Error("Échec de l'envoi WhatsApp")
  }

  return response.json()
}

/**
 * Envoie un message Instagram via la Send API (Messenger Platform).
 * Instagram utilise la même API que Messenger mais avec l'IGSID comme recipient.
 */
export async function sendInstagramMessage(recipientId: string, text: string) {
  const token = process.env.META_ACCESS_TOKEN
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
