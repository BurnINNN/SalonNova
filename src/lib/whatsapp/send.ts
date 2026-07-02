export async function sendWhatsAppEvolutionMessage(
  instanceName: string,
  to: string,
  text: string
) {
  const gatewayUrl = process.env.WHATSAPP_GATEWAY_URL
  const apiKey = process.env.WHATSAPP_GATEWAY_API_KEY

  if (!gatewayUrl || !apiKey) {
    console.log(`\n📨 [MOCK WHATSAPP] → ${to}`)
    console.log(`   Message: ${text}`)
    console.log(`   (Configurez WHATSAPP_GATEWAY_URL et API_KEY pour envoyer réellement)\n`)
    return { mock: true, messageId: `mock_${Date.now()}` }
  }

  // Nettoyer le numéro (garder uniquement les chiffres)
  const cleanNumber = to.replace(/[^\d]/g, '')

  const url = `${gatewayUrl}/message/sendText/${instanceName}`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      number: cleanNumber,
      text: text,
      delay: 1200,
      linkPreview: true,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[WHATSAPP API] Erreur Evolution sendText:', errorText)
    throw new Error(`Échec de l'envoi WhatsApp via Evolution API: ${errorText}`)
  }

  return response.json()
}
