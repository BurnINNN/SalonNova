'use server'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const GATEWAY_URL = process.env.WHATSAPP_GATEWAY_URL
const API_KEY = process.env.WHATSAPP_GATEWAY_API_KEY
const WEBHOOK_VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN

async function getSalonId(): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const employee = await prisma.employee.findUnique({
    where: { userId: user.id },
  })
  if (!employee) throw new Error('Employé non trouvé')

  return employee.salonId
}

/**
 * Récupère le statut actuel de connexion WhatsApp auprès de la passerelle.
 */
export async function getWhatsAppConnectionState() {
  try {
    const salonId = await getSalonId()
    const salon = await prisma.salon.findUnique({ where: { id: salonId } })
    if (!salon) throw new Error('Salon non trouvé')

    const settings = salon.settings as any
    const instanceName = settings.whatsappInstanceName

    if (!instanceName) {
      return { status: 'DISCONNECTED', instanceName: null }
    }

    if (!GATEWAY_URL || !API_KEY) {
      return { status: 'MOCK', instanceName }
    }

    const response = await fetch(`${GATEWAY_URL}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': API_KEY,
      },
    })

    if (!response.ok) {
      // Si l'instance n'existe pas ou erreur, considérer comme déconnectée
      return { status: 'DISCONNECTED', instanceName }
    }

    const data = await response.json()
    const state = data?.instance?.state // 'open', 'close', 'connecting', etc.

    if (state === 'open') {
      return { status: 'CONNECTED', instanceName }
    } else if (state === 'connecting') {
      return { status: 'CONNECTING', instanceName }
    }

    return { status: 'DISCONNECTED', instanceName }
  } catch (error) {
    console.error('[WHATSAPP INTEGRATION] Erreur checking connection state:', error)
    return { status: 'DISCONNECTED', instanceName: null }
  }
}

/**
 * Crée l'instance, configure le webhook et génère un QR code.
 */
export async function generateWhatsAppQrCode() {
  const salonId = await getSalonId()
  const salon = await prisma.salon.findUnique({ where: { id: salonId } })
  if (!salon) throw new Error('Salon non trouvé')

  let settings = salon.settings as any
  let instanceName = settings.whatsappInstanceName

  // Si aucune instance n'est configurée pour ce salon, en générer une unique
  if (!instanceName) {
    instanceName = `salon_${salonId}`
    settings = {
      ...settings,
      whatsappInstanceName: instanceName,
    }
    await prisma.salon.update({
      where: { id: salonId },
      data: { settings },
    })
  }

  if (!GATEWAY_URL || !API_KEY) {
    return {
      success: false,
      error: 'Variables d\'environnement WHATSAPP_GATEWAY_URL ou API_KEY manquantes en local.',
    }
  }

  try {
    // 0. Tenter de supprimer l'instance existante en amont pour éviter les conflits et états corrompus
    try {
      console.log(`[WHATSAPP INTEGRATION] Suppression préventive de l'instance: ${instanceName}`)
      await fetch(`${GATEWAY_URL}/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: {
          'apikey': API_KEY,
        },
      })
    } catch (deleteError) {
      console.log(`[WHATSAPP INTEGRATION] Pas d'instance à supprimer ou erreur silencieuse:`, deleteError)
    }

    // 1. Tenter de créer l'instance
    console.log(`[WHATSAPP INTEGRATION] Création de l'instance: ${instanceName}`)
    const createRes = await fetch(`${GATEWAY_URL}/instance/create`, {
      method: 'POST',
      headers: {
        'apikey': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      }),
    })

    const createData = await createRes.json()
    console.log(`[WHATSAPP INTEGRATION] Résultat création:`, createData)

    // 2. Configurer le Webhook pour l'instance
    console.log(`[WHATSAPP INTEGRATION] Configuration du webhook pour l'instance: ${instanceName}`)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const webhookRes = await fetch(`${GATEWAY_URL}/webhook/set/${instanceName}`, {
      method: 'POST',
      headers: {
        'apikey': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: `${appUrl}/api/webhook/whatsapp-gateway`,
          byEvents: false,
          base64: false,
          events: [
            'MESSAGES_UPSERT'
          ],
          headers: {
            'Authorization': `Bearer ${WEBHOOK_VERIFY_TOKEN || ''}`,
          },
        },
      }),
    })

    if (!webhookRes.ok) {
      console.warn(`[WHATSAPP INTEGRATION] Échec de la configuration du webhook:`, await webhookRes.text())
    } else {
      console.log(`[WHATSAPP INTEGRATION] Webhook configuré avec succès !`)
    }

    // 3. Récupérer le QR Code de connexion
    console.log(`[WHATSAPP INTEGRATION] Récupération du QR code: ${instanceName}`)
    const connectRes = await fetch(`${GATEWAY_URL}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': API_KEY,
      },
    })

    if (!connectRes.ok) {
      throw new Error(`Impossible de se connecter à l'instance: ${await connectRes.text()}`)
    }

    const connectData = await connectRes.json()
    // connectData contient { code: '...', base64: 'data:image/png;base64,...' } ou directement base64
    
    revalidatePath('/settings/integrations')
    return {
      success: true,
      qrcode: connectData.base64 || connectData.qrcode?.base64 || null,
      instanceName,
    }
  } catch (error: any) {
    console.error('[WHATSAPP INTEGRATION] Erreur lors de la génération du QR Code:', error)
    return { success: false, error: error.message || 'Erreur interne de communication avec Railway.' }
  }
}

/**
 * Se déconnecte de WhatsApp et supprime l'instance de la passerelle.
 */
export async function disconnectWhatsApp() {
  try {
    const salonId = await getSalonId()
    const salon = await prisma.salon.findUnique({ where: { id: salonId } })
    if (!salon) throw new Error('Salon non trouvé')

    const settings = salon.settings as any
    const instanceName = settings.whatsappInstanceName

    if (instanceName && GATEWAY_URL && API_KEY) {
      console.log(`[WHATSAPP INTEGRATION] Suppression de l'instance sur la passerelle: ${instanceName}`)
      const response = await fetch(`${GATEWAY_URL}/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: {
          'apikey': API_KEY,
        },
      })
      
      if (!response.ok) {
        console.warn(`[WHATSAPP INTEGRATION] Échec de la suppression de l'instance:`, await response.text())
      }
    }

    // Supprimer l'instanceName des settings du salon
    const updatedSettings = { ...settings }
    delete updatedSettings.whatsappInstanceName

    await prisma.salon.update({
      where: { id: salonId },
      data: { settings: updatedSettings },
    })

    revalidatePath('/settings/integrations')
    return { success: true }
  } catch (error: any) {
    console.error('[WHATSAPP INTEGRATION] Erreur lors de la déconnexion WhatsApp:', error)
    return { success: false, error: error.message || 'Erreur interne.' }
  }
}
