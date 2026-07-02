import { NextRequest, NextResponse } from 'next/server'
import { processMetaEvent } from '@/lib/meta/processor'
import { handleEvolutionIncomingMessage } from '@/lib/whatsapp/processor'

export const dynamic = 'force-dynamic'

/**
 * SIMULATEUR DE WEBHOOK MULTI-CANAL
 * 
 * Permet de tester le système en local sans connexion réelle.
 * Simule la réception de messages :
 * - WhatsApp (via le format Evolution API)
 * - Instagram / Messenger (via le format Meta API)
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Le simulateur n\'est disponible qu\'en mode développement' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { channel, senderPhone, senderId, senderName, message, pageId, instanceName } = body

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
          event: 'messages.upsert',
          instance: instanceName || 'salon_default',
          data: {
            key: {
              remoteJid: `${senderPhone || '212600000000'}@s.whatsapp.net`,
              fromMe: false,
              id: `sim_wa_${Date.now()}`,
            },
            pushName: senderName || 'Client Test',
            message: {
              conversation: message,
            },
            messageType: 'conversation',
            messageTimestamp: Math.floor(Date.now() / 1000),
          },
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

    if (channel === 'WHATSAPP') {
      console.log(`\n🧪 [SIMULATEUR] Envoi d'un message WHATSAPP Evolution simulé:`)
      console.log(`   De: ${senderPhone || 'anonyme'}`)
      console.log(`   Message: "${message}"`)
      
      await handleEvolutionIncomingMessage(simulatedPayload.instance, simulatedPayload.data)
    } else {
      console.log(`\n🧪 [SIMULATEUR] Envoi d'un message META ${channel} simulé:`)
      console.log(`   De: ${senderId || 'anonyme'}`)
      console.log(`   Message: "${message}"`)

      await processMetaEvent(simulatedPayload)
    }

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

export async function GET() {
  return NextResponse.json({
    name: 'Simulateur Webhook Hybride',
    description: 'Testez la messagerie IA sans connexions réelles',
    usage: {
      method: 'POST',
      url: '/api/webhook/simulator',
      body: {
        channel: 'WHATSAPP | INSTAGRAM | MESSENGER',
        message: 'Votre message de test',
        senderPhone: '(WhatsApp uniquement) Numéro du client simulé',
        senderId: '(Instagram/Messenger uniquement) ID du client simulé',
        senderName: '(Optionnel) Nom du client',
        instanceName: '(Optionnel WhatsApp) Nom de la session du salon',
        pageId: '(Optionnel Instagram/Messenger) ID de la page du salon',
      },
    },
  })
}

