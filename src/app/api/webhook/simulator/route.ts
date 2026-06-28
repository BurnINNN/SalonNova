import { NextRequest, NextResponse } from 'next/server'
import { processMetaEvent } from '@/lib/meta/processor'

export const dynamic = 'force-dynamic'

/**
 * SIMULATEUR DE WEBHOOK META
 * 
 * Permet de tester le système sans avoir de compte Meta configuré.
 * Envoie un faux événement webhook comme si un client avait envoyé un message.
 * 
 * Usage : POST /api/webhook/simulator
 * Body : {
 *   "channel": "WHATSAPP" | "INSTAGRAM" | "MESSENGER",
 *   "senderPhone": "212612345678",     // Pour WhatsApp
 *   "senderId": "1234567890",          // Pour Instagram/Messenger
 *   "senderName": "Test Client",
 *   "message": "Bonjour, je voudrais un rendez-vous",
 *   "phoneNumberId": "YOUR_PHONE_ID",  // ID configuré dans les settings du salon
 *   "pageId": "YOUR_PAGE_ID"           // Pour Instagram/Messenger
 * }
 */
export async function POST(request: NextRequest) {
  // Sécurité : uniquement en développement
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Le simulateur n\'est disponible qu\'en mode développement' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { channel, senderPhone, senderId, senderName, message, phoneNumberId, pageId } = body

    if (!channel || !message) {
      return NextResponse.json(
        { error: 'Les champs "channel" et "message" sont requis' },
        { status: 400 }
      )
    }

    let simulatedPayload: any

    switch (channel) {
      case 'WHATSAPP':
        simulatedPayload = {
          object: 'whatsapp_business_account',
          entry: [{
            id: 'SIMULATED_WABA',
            changes: [{
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '15550000000',
                  phone_number_id: phoneNumberId || 'SIMULATED_PHONE_ID',
                },
                contacts: [{
                  profile: { name: senderName || 'Client Test' },
                  wa_id: senderPhone || '212600000000',
                }],
                messages: [{
                  from: senderPhone || '212600000000',
                  id: `sim_wa_${Date.now()}`,
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  type: 'text',
                  text: { body: message },
                }],
              },
              field: 'messages',
            }],
          }],
        }
        break

      case 'INSTAGRAM':
        simulatedPayload = {
          object: 'instagram',
          entry: [{
            id: pageId || 'SIMULATED_IG_PAGE',
            time: Date.now(),
            messaging: [{
              sender: { id: senderId || `ig_${Date.now()}` },
              recipient: { id: pageId || 'SIMULATED_IG_PAGE' },
              timestamp: Date.now(),
              message: {
                mid: `sim_ig_${Date.now()}`,
                text: message,
              },
            }],
          }],
        }
        break

      case 'MESSENGER':
        simulatedPayload = {
          object: 'page',
          entry: [{
            id: pageId || 'SIMULATED_FB_PAGE',
            time: Date.now(),
            messaging: [{
              sender: { id: senderId || `fb_${Date.now()}` },
              recipient: { id: pageId || 'SIMULATED_FB_PAGE' },
              timestamp: Date.now(),
              message: {
                mid: `sim_fb_${Date.now()}`,
                text: message,
              },
            }],
          }],
        }
        break

      default:
        return NextResponse.json(
          { error: 'Canal invalide. Utilisez: WHATSAPP, INSTAGRAM ou MESSENGER' },
          { status: 400 }
        )
    }

    console.log(`\n🧪 [SIMULATEUR] Envoi d'un message ${channel} simulé:`)
    console.log(`   De: ${senderPhone || senderId || 'anonyme'}`)
    console.log(`   Message: "${message}"`)

    // Traiter le payload comme un vrai webhook
    await processMetaEvent(simulatedPayload)

    return NextResponse.json({
      success: true,
      message: `Message ${channel} simulé traité avec succès`,
      channel,
      payload: simulatedPayload,
    })
  } catch (error: any) {
    console.error('[SIMULATEUR] Erreur:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur interne' },
      { status: 500 }
    )
  }
}

/**
 * GET : Documentation du simulateur
 */
export async function GET() {
  return NextResponse.json({
    name: 'Simulateur Webhook Meta',
    description: 'Testez la messagerie IA sans compte Meta configuré',
    usage: {
      method: 'POST',
      url: '/api/webhook/simulator',
      body: {
        channel: 'WHATSAPP | INSTAGRAM | MESSENGER',
        message: 'Votre message de test',
        senderPhone: '(WhatsApp) Numéro du client simulé',
        senderId: '(Instagram/Messenger) ID du client simulé',
        senderName: '(Optionnel) Nom du client',
        phoneNumberId: '(WhatsApp) Phone Number ID configuré dans les settings du salon',
        pageId: '(Instagram/Messenger) Page ID configuré dans les settings du salon',
      },
    },
    examples: [
      {
        description: 'Simuler un message WhatsApp',
        body: {
          channel: 'WHATSAPP',
          senderPhone: '212612345678',
          senderName: 'Yasmine',
          message: 'Bonjour, combien coûte un balayage ?',
          phoneNumberId: 'VOTRE_PHONE_NUMBER_ID',
        },
      },
      {
        description: 'Simuler un message Instagram',
        body: {
          channel: 'INSTAGRAM',
          senderId: 'ig_user_123',
          message: 'Salut, vous faites les lissages ?',
          pageId: 'VOTRE_INSTAGRAM_PAGE_ID',
        },
      },
    ],
  })
}
