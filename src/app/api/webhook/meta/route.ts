import { NextRequest, NextResponse } from 'next/server'
import { verifyMetaSignature } from '@/lib/meta/verify'
import { processMetaEvent } from '@/lib/meta/processor'

export const dynamic = 'force-dynamic'

// GET : vérification du webhook par Meta lors de la configuration
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return new NextResponse('Forbidden', { status: 403 })
}

// POST : réception des événements Meta
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256')

  console.log('\n--- 🔴 [WEBHOOK META REÇU] ---')
  console.log('Signature HMAC :', signature)
  console.log('Body brut (extrait) :', rawBody.substring(0, 200) + '...')

  // 1. Valider la signature HMAC AVANT tout traitement
  if (!verifyMetaSignature(rawBody, signature)) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // 2. Traitement synchrone pour éviter le gel de la fonction serverless sur Vercel
  const body = JSON.parse(rawBody)
  await processMetaEvent(body)

  return new NextResponse('OK', { status: 200 })
}
