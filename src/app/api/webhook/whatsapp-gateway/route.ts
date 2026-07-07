import { NextRequest, NextResponse } from 'next/server'
import { handleEvolutionIncomingMessage } from '@/lib/whatsapp/processor'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // Optionnel : vérification du token de sécurité dans les headers
  const authHeader = request.headers.get('Authorization')
  const webhookVerifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
  
  if (webhookVerifyToken && authHeader !== `Bearer ${webhookVerifyToken}`) {
    console.warn('[WEBHOOK EVOLUTION] Tentative non autorisée avec le token :', authHeader)
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const body = await request.json()
    
    // Les événements de l'Evolution API sont structurés avec body.event
    if (body.event === 'messages.upsert') {
      const data = body.data
      const key = data?.key

      // Ignorer si le message vient de nous-mêmes pour éviter les boucles infinies de l'IA
      if (key?.fromMe) {
        return NextResponse.json({ status: 'ignored_from_me' }, { status: 200 })
      }

      console.log(`\n--- 🟢 [WEBHOOK EVOLUTION API REÇU] ---`)
      console.log('Instance :', body.instance)
      console.log('Message ID :', key?.id)
      console.log('Expéditeur :', key?.remoteJid)

      // Traitement synchrone pour éviter le gel de la fonction serverless sur Vercel
      await handleEvolutionIncomingMessage(body.instance, data)
    }

    return NextResponse.json({ status: 'OK' }, { status: 200 })
  } catch (error) {
    console.error('[WEBHOOK EVOLUTION] Erreur lors de la réception :', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
