'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const SalonSettingsSchema = z.object({
  currency: z.string().default('MAD'),
  timezone: z.string().default('Africa/Casablanca'),
  llmProvider: z.enum(['gemini']).default('gemini'),
  whatsappInstanceName: z.string().optional(),
  instagramPageId: z.string().optional(),
  messengerPageId: z.string().optional(),
  // ---- Nouveaux champs pour la messagerie IA ----
  address: z.string().optional(),
  googleMapsUrl: z.string().optional(),
  phone: z.string().optional(),
  openingHours: z.string().optional(),
  language: z.string().default('français'),
  aiName: z.string().optional(),
  aiTone: z.string().default('chaleureux et professionnel'),
  hairCareRules: z.string().optional(),
})

const UpdateSalonSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  settings: SalonSettingsSchema,
})

export type UpdateSalonInput = z.infer<typeof UpdateSalonSchema>
export type SalonSettingsType = z.infer<typeof SalonSettingsSchema>

export async function getSalon(id: string) {
  const salon = await prisma.salon.findUnique({
    where: { id },
  })
  
  if (!salon) return null

  // Ensure settings is correctly typed and parseable
  let parsedSettings: SalonSettingsType = {
    currency: 'MAD',
    timezone: 'Africa/Casablanca',
    llmProvider: 'gemini',
    language: 'français',
    aiTone: 'chaleureux et professionnel',
  }
  
  try {
    if (salon.settings) {
      const parsed = typeof salon.settings === 'string' ? JSON.parse(salon.settings) : salon.settings
      parsedSettings = SalonSettingsSchema.parse(parsed)
    }
  } catch (error) {
    console.error('Failed to parse salon settings:', error)
  }

  return {
    ...salon,
    settings: parsedSettings,
  }
}

export async function updateSalon(id: string, input: UpdateSalonInput) {
  const data = UpdateSalonSchema.parse(input)

  const salon = await prisma.salon.update({
    where: { id },
    data: {
      name: data.name,
      settings: data.settings,
    },
  })

  revalidatePath('/settings/general')
  return salon
}
