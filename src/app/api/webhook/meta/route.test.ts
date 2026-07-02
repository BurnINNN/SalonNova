import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'
import { verifyMetaSignature } from '@/lib/meta/verify'
import { processMetaEvent } from '@/lib/meta/processor'

// Mock des fonctions de vérification et de traitement
vi.mock('@/lib/meta/verify', () => ({
  verifyMetaSignature: vi.fn(),
}))

vi.mock('@/lib/meta/processor', () => ({
  processMetaEvent: vi.fn().mockResolvedValue(undefined),
}))

describe('Meta Webhook Route API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.META_WEBHOOK_VERIFY_TOKEN = 'test_verify_token'
  })

  describe('GET - Vérification du Webhook', () => {
    it('devrait retourner le challenge 200 OK si le token de vérification est valide', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/webhook/meta?hub.mode=subscribe&hub.verify_token=test_verify_token&hub.challenge=challenge_123'
      )

      const response = await GET(request)

      expect(response.status).toBe(200)
      const text = await response.text()
      expect(text).toBe('challenge_123')
    })

    it('devrait retourner 403 Forbidden si le token de vérification est invalide', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/webhook/meta?hub.mode=subscribe&hub.verify_token=invalid_token&hub.challenge=challenge_123'
      )

      const response = await GET(request)

      expect(response.status).toBe(403)
      const text = await response.text()
      expect(text).toBe('Forbidden')
    })
  })

  describe('POST - Réception des événements Meta', () => {
    it('devrait retourner 401 Unauthorized si la signature est invalide', async () => {
      vi.mocked(verifyMetaSignature).mockReturnValue(false)

      const request = new NextRequest('http://localhost:3000/api/webhook/meta', {
        method: 'POST',
        headers: {
          'x-hub-signature-256': 'sha256=invalid_sig',
        },
        body: JSON.stringify({ object: 'page', entry: [] }),
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
      const text = await response.text()
      expect(text).toBe('Unauthorized')
      expect(processMetaEvent).not.toHaveBeenCalled()
    })

    it('devrait retourner 200 OK et traiter l\'événement asynchronement si la signature est valide', async () => {
      vi.mocked(verifyMetaSignature).mockReturnValue(true)

      const payload = { object: 'whatsapp_business_account', entry: [{ changes: [] }] }
      const request = new NextRequest('http://localhost:3000/api/webhook/meta', {
        method: 'POST',
        headers: {
          'x-hub-signature-256': 'sha256=valid_sig',
        },
        body: JSON.stringify(payload),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      const text = await response.text()
      expect(text).toBe('OK')

      // Attendre un tick de microtask pour que le processMetaEvent asynchrone soit appelé
      await new Promise((resolve) => setTimeout(resolve, 0))
      
      expect(processMetaEvent).toHaveBeenCalled()
    })
  })
})
