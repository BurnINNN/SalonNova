import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse('Accès Interdit', { status: 403 });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    if (payload.object === 'page' && payload.entry?.[0]?.messaging) {
      const messagingEvent = payload.entry[0].messaging[0];
      const senderId = messagingEvent.sender.id;
      const recipientId = messagingEvent.recipient.id;
      const incomingText = messagingEvent.message?.text;

      if (!incomingText) return NextResponse.json({ status: 'ignored' }, { status: 200 });

      const integration = await prisma.integration.findUnique({
        where: { metaPageId: recipientId },
        include: { salon: { include: { automations: { include: { triggers: true, listeners: true } } } } }
      });

      if (!integration || !integration.isActive) {
        return NextResponse.json({ error: 'Tenant non configuré ou inactif' }, { status: 200 });
      }

      const activeAutomation = integration.salon.automations.find(auto => 
        auto.isActive && auto.triggers.some(trig => incomingText.toLowerCase().includes(trig.keyword.toLowerCase()))
      );

      if (activeAutomation && activeAutomation.listeners.length > 0) {
        const listener = activeAutomation.listeners[0];
        let replyText = "Bonjour ! Comment puis-je vous aider ?";

        if (listener.type === 'SMART_AI') {
          replyText = `[Mode IA activé avec le prompt du salon] Réponse à : "${incomingText}"`;
        } else {
          replyText = listener.prompt;
        }

        await fetch(`https://graph.facebook.com/v18.0/me/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${integration.permanentToken}`
          },
          body: JSON.stringify({
            recipient: { id: senderId },
            message: { text: replyText }
          })
        });
      }
    }

    return NextResponse.json({ status: 'success' }, { status: 200 });

  } catch (error: any) {
    console.error("Erreur critique au sein de l'aiguilleur de Webhook:", error.message);
    return NextResponse.json({ status: 'error_handled' }, { status: 200 });
  }
}
