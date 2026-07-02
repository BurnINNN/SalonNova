import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleEvolutionIncomingMessage } from './processor'
import { prisma } from '@/lib/prisma'
import { callLLM } from '@/lib/ai/llm'
import { sendChannelMessage } from '@/lib/meta/send'

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

vi.mock('@/lib/meta/send', () => ({
  sendChannelMessage: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('@/lib/ai/image-handler', () => ({
  compressAndConvertImage: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/ai/rdv-parser', () => ({
  hasRdvJson: vi.fn().mockReturnValue(false),
  parseAndCreateRdv: vi.fn(),
}))

describe('WhatsApp Evolution Webhook Processor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('handleEvolutionIncomingMessage', () => {
    const mockWhatsAppEventData = {
      key: {
        remoteJid: '212612345678@s.whatsapp.net',
        fromMe: false,
        id: 'EVOLUTION_MSG_ID_123',
      },
      pushName: 'Jean Dupont',
      message: {
        conversation: 'Bonjour, je souhaite prendre RDV.',
      },
      messageType: 'conversation',
      messageTimestamp: 1672531199,
    }

    it('devrait traiter le message avec succès si le salon est déjà configuré', async () => {
      const mockSalon = {
        id: 'salon_123',
        name: 'Salon BeColor',
        settings: { whatsappInstanceName: 'instance_salon_123' },
      }

      const mockClient = {
        id: 'client_456',
        firstName: 'Jean',
        lastName: 'Dupont',
        whatsappId: '212612345678',
      }

      const mockConversation = {
        id: 'conv_789',
        status: 'BOT',
        externalId: '212612345678',
        channel: 'WHATSAPP',
      }

      // Simulation de la base de données
      vi.mocked(prisma.salon.findFirst).mockResolvedValue(mockSalon as any)
      vi.mocked(prisma.client.findFirst).mockResolvedValue(mockClient as any)
      vi.mocked(prisma.conversation.findFirst).mockResolvedValue(mockConversation as any)
      vi.mocked(callLLM).mockResolvedValue({ text: 'Bonjour ! Comment puis-je vous aider ?', toolsExecuted: [] })

      await handleEvolutionIncomingMessage('instance_salon_123', mockWhatsAppEventData)

      // Vérifier que le salon a été cherché avec whatsappInstanceName
      expect(prisma.salon.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            settings: expect.objectContaining({
              equals: 'instance_salon_123',
            }),
          }),
        })
      )
      
      // Pas d'auto-association nécessaire puisqu'il était trouvé
      expect(prisma.salon.update).not.toHaveBeenCalled()
      
      // Vérifier que le message a été créé
      expect(prisma.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            content: 'Bonjour, je souhaite prendre RDV.',
            role: 'USER',
          }),
        })
      )

      // Vérifier l'appel à l'IA
      expect(callLLM).toHaveBeenCalledWith(
        'salon_123',
        'conv_789',
        'Bonjour, je souhaite prendre RDV.',
        { channel: 'WHATSAPP', externalId: '212612345678' },
        null
      )

      // Vérifier l'envoi de la réponse de l'IA
      expect(sendChannelMessage).toHaveBeenCalledWith(
        'WHATSAPP',
        '212612345678',
        'Bonjour ! Comment puis-je vous aider ?',
        'instance_salon_123'
      )
    })

    it('devrait associer automatiquement la session s\'il n\'est pas configuré ET qu\'il n\'y a qu\'un seul salon dans la DB', async () => {
      const mockSingleSalon = {
        id: 'salon_unique',
        name: 'Salon Unique',
        settings: {},
      }

      const mockClient = {
        id: 'client_456',
        firstName: 'Jean',
        lastName: 'Dupont',
        whatsappId: '212612345678',
      }

      const mockConversation = {
        id: 'conv_789',
        status: 'BOT',
        externalId: '212612345678',
        channel: 'WHATSAPP',
      }

      // Première requête findFirst renvoie null
      vi.mocked(prisma.salon.findFirst).mockResolvedValue(null)
      // findMany renvoie un seul salon unique
      vi.mocked(prisma.salon.findMany).mockResolvedValue([mockSingleSalon] as any)
      
      // Simulation des requêtes suivantes
      vi.mocked(prisma.client.findFirst).mockResolvedValue(mockClient as any)
      vi.mocked(prisma.conversation.findFirst).mockResolvedValue(mockConversation as any)
      vi.mocked(callLLM).mockResolvedValue({ text: 'Bonjour ! Comment puis-je vous aider ?', toolsExecuted: [] })

      await handleEvolutionIncomingMessage('instance_test_auto', mockWhatsAppEventData)

      // Vérifier que la recherche de salon a échoué d'abord
      expect(prisma.salon.findFirst).toHaveBeenCalled()
      expect(prisma.salon.findMany).toHaveBeenCalled()

      // Vérifier que la configuration du salon unique a été mise à jour avec le nom de l'instance
      expect(prisma.salon.update).toHaveBeenCalledWith({
        where: { id: 'salon_unique' },
        data: {
          settings: {
            whatsappInstanceName: 'instance_test_auto',
          },
        },
      })

      // Vérifier qu'on a tout de même continué le flux de traitement
      expect(prisma.message.create).toHaveBeenCalled()
      expect(callLLM).toHaveBeenCalled()
      expect(sendChannelMessage).toHaveBeenCalled()
    })

    it('devrait ignorer silencieusement le message s\'il n\'est pas configuré ET qu\'il y a plusieurs salons dans la DB', async () => {
      const mockSalons = [
        { id: 'salon_1', name: 'BeColor 1', settings: {} },
        { id: 'salon_2', name: 'BeColor 2', settings: {} },
      ]

      vi.mocked(prisma.salon.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.salon.findMany).mockResolvedValue(mockSalons as any)

      await handleEvolutionIncomingMessage('instance_inconnue', mockWhatsAppEventData)

      // Devrait s'arrêter à la vérification sans mettre à jour
      expect(prisma.salon.update).not.toHaveBeenCalled()
      expect(prisma.message.create).not.toHaveBeenCalled()
      expect(callLLM).not.toHaveBeenCalled()
    })
  })
})
