import { PrismaClient } from '@prisma/client'
import { callLLM } from './src/lib/ai/llm'
import * as dotenv from 'dotenv'
import * as readline from 'readline'

// Charger les variables d'environnement
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const prisma = new PrismaClient()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => rl.question(query, resolve))
}

async function run() {
  console.clear()
  console.log("\x1b[36m========================================================\x1b[0m")
  console.log("\x1b[36m✨ SIMULATEUR INTERACTIF - AGENT IA MESSAGERIE (BeColor) ✨\x1b[0m")
  console.log("\x1b[36m========================================================\x1b[0m")
  
  // Trouver le salon BeColor
  const salon = await prisma.salon.findFirst({
    where: { name: 'BeColor' }
  })
  
  if (!salon) {
    console.error("\x1b[31m❌ Erreur : Le salon 'BeColor' n'a pas été trouvé dans la base de données.\x1b[0m")
    process.exit(1)
  }
  
  console.log(`🏠 Salon connecté : \x1b[33m${salon.name}\x1b[0m (ID: ${salon.id})`)
  
  // Charger les prestations
  const services = await prisma.service.findMany({
    where: { salonId: salon.id, isActive: true },
    select: { name: true, price: true, duration: true }
  })
  console.log(`📋 Catalogue : \x1b[32m${services.length} prestations actives\x1b[0m`)
  
  // Sélection du client
  console.log("\n👤 \x1b[1mChoisissez un profil client pour le test :\x1b[0m")
  console.log("  [1] Nouveau client (Inconnu, l'IA demandera son prénom)")
  
  const testClients = await prisma.client.findMany({
    where: { salonId: salon.id },
    take: 5,
    select: { id: true, firstName: true, lastName: true, phone: true }
  })
  
  testClients.forEach((c, idx) => {
    console.log(`  [${idx + 2}] Client existant : ${c.firstName} ${c.lastName} ${c.phone ? `(${c.phone})` : ''}`)
  })
  
  const choiceInput = await question("\n👉 Votre choix (numéro) : ")
  const choiceIdx = parseInt(choiceInput, 10)
  
  let selectedClientId: string | null = null
  let selectedClientName = "Nouveau client"
  
  if (choiceIdx > 1 && choiceIdx <= testClients.length + 1) {
    const client = testClients[choiceIdx - 2]
    selectedClientId = client.id
    selectedClientName = `${client.firstName} ${client.lastName}`
    console.log(`\n✅ Client sélectionné : \x1b[33m${selectedClientName}\x1b[0m (ID: ${client.id})`)
  } else {
    console.log("\n✅ Mode : \x1b[33mNouveau client\x1b[0m")
  }
  
  // Création d'une nouvelle conversation
  const externalId = `sim-manual-${Date.now()}`
  const conversation = await prisma.conversation.create({
    data: {
      salonId: salon.id,
      channel: 'WHATSAPP',
      externalId: externalId,
      status: 'BOT',
      clientId: selectedClientId,
      aiContext: '[]'
    }
  })
  
  console.log(`📬 Conversation créée (ID conversation BDD : \x1b[35m${conversation.id}\x1b[0m)`)
  console.log("\n💬 \x1b[32mDébut de la conversation. Tapez votre message et appuyez sur Entrée.\x1b[0m")
  console.log("\x1b[90m(Tapez 'exit' ou 'quit' pour quitter le simulateur)\x1b[0m\n")
  
  let active = true
  while (active) {
    const userInput = await question("\x1b[1m👤 Vous : \x1b[0m")
    
    if (userInput.trim().toLowerCase() === 'exit' || userInput.trim().toLowerCase() === 'quit') {
      console.log("\n👋 Fin de la simulation.")
      active = false
      break
    }
    
    if (!userInput.trim()) continue
    
    // 1. Enregistrer le message utilisateur
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        content: userInput,
        role: 'USER'
      }
    })
    
    console.log("\x1b[90m⏳ Sofia réfléchit...\x1b[0m")
    
    try {
      // 2. Appeler l'IA avec Gemini 2.5 Flash
      const response = await callLLM(salon.id, conversation.id, userInput, {
        channel: 'WHATSAPP',
        externalId: externalId
      })
      
      // 3. Enregistrer la réponse de l'IA
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          content: response.text,
          role: 'ASSISTANT'
        }
      })
      
      console.log(`\n\x1b[34m🤖 Sofia : \x1b[0m${response.text}`)
      
      // 4. Afficher les outils exécutés
      if (response.toolsExecuted && response.toolsExecuted.length > 0) {
        console.log("\n\x1b[90m🛠️  [Outils exécutés] :")
        response.toolsExecuted.forEach((t) => {
          console.log(`   👉 ${t.name} (Résultat : ${JSON.stringify(t.result?.data || t.result || {})})`)
        })
        console.log("\x1b[0m")
      }
      
      // 5. Vérifier si la conversation a été escaladée à un humain
      const currentConv = await prisma.conversation.findUnique({
        where: { id: conversation.id }
      })
      
      if (currentConv && currentConv.status === 'HUMAN') {
        console.log("\n\x1b[31m⚠️  [Escalade] La conversation a été basculée vers un humain (Status: HUMAN). Le simulateur s'arrête.\x1b[0m")
        active = false
      }
      
    } catch (err: any) {
      console.error("\n\x1b[31m❌ Erreur lors de l'appel LLM :\x1b[0m", err.message || err)
    }
  }
  
  rl.close()
}

run()
  .catch((e) => {
    console.error(e)
    rl.close()
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
