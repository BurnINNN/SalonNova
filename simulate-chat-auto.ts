import { PrismaClient } from '@prisma/client'
import { callLLM } from './src/lib/ai/llm'
import * as dotenv from 'dotenv'

// Charger les variables d'environnement
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const prisma = new PrismaClient()

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, 13000))
}

async function runScenario(
  title: string,
  initialClientId: string | null,
  turns: string[]
) {
  console.log(`\n==================================================`);
  console.log(`🎬 SCÉNARIO : ${title}`);
  console.log(`==================================================`);

  const salon = await prisma.salon.findFirst({
    where: { name: 'BeColor' }
  })

  if (!salon) {
    console.error("❌ Salon 'BeColor' introuvable.")
    return
  }

  // Créer une conversation de test
  const externalId = `sim-auto-${Date.now()}`
  const conversation = await prisma.conversation.create({
    data: {
      salonId: salon.id,
      channel: 'WHATSAPP',
      externalId: externalId,
      status: 'BOT',
      clientId: initialClientId,
      aiContext: '[]'
    }
  })

  console.log(`[Conversation créée - ID: ${conversation.id}]`);

  for (let i = 0; i < turns.length; i++) {
    const userMsg = turns[i]
    console.log(`\n👤 Client : "${userMsg}"`)

    // Enregistrer le message utilisateur
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        content: userMsg,
        role: 'USER'
      }
    })

    console.log("⏳ L'IA réfléchit...");
    try {
      const start = Date.now()
      const response = await callLLM(salon.id, conversation.id, userMsg, {
        channel: 'WHATSAPP',
        externalId: externalId
      })
      const duration = ((Date.now() - start) / 1000).toFixed(1)

      // Enregistrer la réponse de l'IA
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          content: response.text,
          role: 'ASSISTANT'
        }
      })

      console.log(`🤖 Sofia (${duration}s) : ${response.text}`)

      if (response.toolsExecuted && response.toolsExecuted.length > 0) {
        console.log(`🛠️  [Outils appelés] :`)
        response.toolsExecuted.forEach(t => {
          console.log(`   👉 ${t.name}(${JSON.stringify(t.result?.data || t.result || {})})`)
        })
      }

      // Check if conversation status changed
      const currentConv = await prisma.conversation.findUnique({
        where: { id: conversation.id }
      })
      if (currentConv && currentConv.status === 'HUMAN') {
        console.log(`⚠️  [Escalade] La conversation a été transférée à un humain !`);
        break
      }

    } catch (error: any) {
      console.error(`❌ Erreur :`, error.message || error)
    }

    // Petit délai entre les tours pour la lisibilité
    await delay(1000)
  }

  // Nettoyage optionnel ou affichage de fin
  console.log(`\n🏁 Fin du scénario "${title}"`);
}

async function main() {
  console.log("🚀 Lancement des simulations d'agent IA pour le salon BeColor...");

  // Scenario 1: Existing client (Hanae) bookings a Balayage
  // Hanae is client cmqcjgk4q0001x287e5yyh5kq in BeColor
  const clientHanae = await prisma.client.findFirst({
    where: { firstName: 'Hanae', salon: { name: 'BeColor' } }
  })
  
  const hanaeId = clientHanae ? clientHanae.id : null
  if (!clientHanae) {
    console.log("⚠️ Client Hanae introuvable. On lancera le scénario sans ID initial pour voir si l'IA la retrouve.");
  }

  await runScenario(
    "1. Réservation Balayage par Hanae Elebbar (Client existant)",
    null, // On part de null pour simuler l'identification à partir de son prénom
    [
      "Bonjour, j'aimerais prendre rendez-vous pour un Balayage cette semaine s'il vous plaît.",
      "Hanae Elebbar",
      "Mes cheveux sont en bonne santé. J'aimerais venir ce vendredi 3 juillet après-midi.",
      "Je réserve le créneau de 14:30."
    ]
  )

  await runScenario(
    "2. Détection de cheveux abîmés (Règles de sécurité capillaire)",
    null,
    [
      "Bonjour, je m'appelle Yasmine. Je voudrais réserver un Balayage s'il vous plaît.",
      "J'avoue que mes cheveux sont très abîmés et cassants ces derniers temps en raison de décolorations répétées.",
      "Ah d'accord, alors quel soin me conseillez-vous à la place ?",
      "Parfait, combien coûte le Soin Plex et quand puis-je venir cette semaine ?"
    ]
  )
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })
