import { describe, it, expect, vi, beforeEach } from 'vitest'
import { processMetaEvent } from './processor'
import { prisma } from '@/lib/prisma'
import { callLLM } from '@/lib/ai/llm'
import { sendChannelMessage } from './send'

// Mocks complets des dépendances externes
vi.mock('@/lib/prisma', () => ({
  prisma: {
    salon: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    client: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    conversation: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    message: {
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/ai/llm', () => ({
  callLLM: vi.fn(),
}))

vi.mock('./send', () => ({
  sendChannelMessage: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('@/lib/ai/image-handler', () => ({
  processIncomingImage: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/ai/rdv-parser', () => ({
  hasRdvJson: vi.fn().mockReturnValue(false),
  parseAndCreateRdv: vi.fn(),
}))

describe('Meta Webhook Processor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Instagram & Messenger Events', () => {
    const mockInstagramBody = {
      object: 'instagram',
      entry: [
        {
          id: 'SIMULATED_IG_PAGE',
          time: Date.now(),
          messaging: [
            {
              sender: { id: 'ig_user_123' },
              recipient: { id: 'SIMULATED_IG_PAGE' },
              timestamp: Date.now(),
              message: {
                mid: 'mid_12345',
                text: 'Bonjour Instagram !',
              },
            },
          ],
        },
      ],
    }

    it('devrait traiter le message Instagram avec succès si le salon est configuré', async () => {
      const mockSalon = {
        id: 'salon_123',
        name: 'Salon BeColor',
        settings: { instagramPageId: 'SIMULATED_IG_PAGE' },
      }

      const mockClient = {
        id: 'client_456',
        firstName: 'Jean',
        lastName: 'Dupont',
        instagramId: 'ig_user_123',
      }

      const mockConversation = {
        id: 'conv_789',
        status: 'BOT',
        externalId: 'ig_user_123',
        channel: 'INSTAGRAM',
      }

      vi.mocked(prisma.salon.findFirst).mockResolvedValue(mockSalon as any)
      vi.mocked(prisma.client.findFirst).mockResolvedValue(mockClient as any)
      vi.mocked(prisma.conversation.findFirst).mockResolvedValue(mockConversation as any)
      vi.mocked(callLLM).mockResolvedValue({ text: 'Réponse Instagram', toolsExecuted: [] })

      await processMetaEvent(mockInstagramBody)

      expect(prisma.salon.findFirst).toHaveBeenCalled()
      expect(prisma.message.create).toHaveBeenCalled()
      expect(callLLM).toHaveBeenCalled()
      expect(sendChannelMessage).toHaveBeenCalledWith(
        'INSTAGRAM',
        'ig_user_123',
        'Réponse Instagram',
        undefined
      )
    })
  })
})

