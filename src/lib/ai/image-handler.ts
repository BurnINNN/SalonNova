/**
 * Module de gestion des images pour la messagerie IA.
 * 
 * Fonctionnalités :
 * - Téléchargement d'images depuis les URLs Meta (WhatsApp, Instagram, Messenger)
 * - Compression à 512px maximum pour réduire les tokens (économie de ~75%)
 * - Conversion en base64 pour l'API Anthropic/OpenAI
 * 
 * Note : Utilise `sharp` pour la compression. Si sharp n'est pas disponible,
 * utilise un fallback avec Canvas ou retourne l'image brute.
 */

type MediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

export interface ProcessedImage {
  base64: string
  mediaType: MediaType
  originalSizeBytes: number
  compressedSizeBytes: number
}

const MAX_DIMENSION = 512 // Pixel max sur le côté le plus long

/**
 * Télécharge une image depuis une URL Meta (avec authentification).
 * WhatsApp utilise un endpoint spécifique qui nécessite le token Meta.
 */
export async function downloadMetaImage(
  mediaUrl: string,
  channel: 'WHATSAPP' | 'INSTAGRAM' | 'MESSENGER'
): Promise<Buffer | null> {
  const token = process.env.META_ACCESS_TOKEN

  try {
    // WhatsApp : les URLs média nécessitent le token d'authentification
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(mediaUrl, { headers })

    if (!response.ok) {
      console.error(`[IMAGE] Erreur téléchargement (${response.status}):`, await response.text())
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    console.error('[IMAGE] Erreur téléchargement:', error)
    return null
  }
}

/**
 * Pour WhatsApp, récupère l'URL de téléchargement d'un média via l'API Graph.
 * WhatsApp envoie un `media_id` dans le webhook, pas directement une URL.
 */
export async function getWhatsAppMediaUrl(mediaId: string): Promise<string | null> {
  const token = process.env.META_ACCESS_TOKEN
  if (!token) {
    console.log('[IMAGE] Pas de META_ACCESS_TOKEN, impossible de récupérer le média WhatsApp')
    return null
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })

    if (!response.ok) return null

    const data = await response.json()
    return data.url || null
  } catch (error) {
    console.error('[IMAGE] Erreur récupération URL WhatsApp:', error)
    return null
  }
}

/**
 * Compresse et convertit une image en base64.
 * Redimensionne à 512px max et convertit en JPEG pour réduire la taille.
 */
export async function compressAndConvertImage(
  imageBuffer: Buffer
): Promise<ProcessedImage | null> {
  const originalSizeBytes = imageBuffer.length

  try {
    // Tenter d'utiliser sharp pour la compression
    const sharp = await importSharp()

    if (sharp) {
      const compressed = await sharp(imageBuffer)
        .resize(MAX_DIMENSION, MAX_DIMENSION, {
          fit: 'inside',        // Garde les proportions
          withoutEnlargement: true, // Ne pas agrandir les petites images
        })
        .jpeg({ quality: 80 })
        .toBuffer()

      return {
        base64: compressed.toString('base64'),
        mediaType: 'image/jpeg',
        originalSizeBytes,
        compressedSizeBytes: compressed.length,
      }
    }

    // Fallback : envoyer l'image brute en base64 (pas de compression)
    console.warn('[IMAGE] sharp non disponible, envoi de l\'image brute')

    // Détecter le type MIME basique
    const mediaType = detectMediaType(imageBuffer)

    return {
      base64: imageBuffer.toString('base64'),
      mediaType,
      originalSizeBytes,
      compressedSizeBytes: originalSizeBytes,
    }
  } catch (error) {
    console.error('[IMAGE] Erreur compression:', error)
    return null
  }
}

/**
 * Processus complet : télécharge, compresse et convertit une image.
 * Point d'entrée principal pour le processor.
 */
export async function processIncomingImage(
  mediaUrlOrId: string,
  channel: 'WHATSAPP' | 'INSTAGRAM' | 'MESSENGER'
): Promise<ProcessedImage | null> {
  let mediaUrl = mediaUrlOrId

  // WhatsApp : convertir le media_id en URL téléchargeable
  if (channel === 'WHATSAPP' && !mediaUrlOrId.startsWith('http')) {
    const url = await getWhatsAppMediaUrl(mediaUrlOrId)
    if (!url) return null
    mediaUrl = url
  }

  // Télécharger l'image
  const buffer = await downloadMetaImage(mediaUrl, channel)
  if (!buffer) return null

  // Compresser et convertir
  return compressAndConvertImage(buffer)
}

// ============================================================
// UTILITAIRES INTERNES
// ============================================================

/**
 * Import dynamique de sharp (peut ne pas être installé).
 */
async function importSharp(): Promise<any | null> {
  try {
    const sharp = (await import('sharp')).default
    return sharp
  } catch {
    return null
  }
}

/**
 * Détecte le type MIME d'une image à partir de ses premiers octets.
 */
function detectMediaType(buffer: Buffer): MediaType {
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) return 'image/jpeg'
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png'
  if (buffer[0] === 0x47 && buffer[1] === 0x49) return 'image/gif'
  if (buffer[0] === 0x52 && buffer[1] === 0x49) return 'image/webp'
  return 'image/jpeg' // Default
}
