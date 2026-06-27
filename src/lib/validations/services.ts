import { z } from 'zod'
import { parseNumber } from './utils'

export const ServiceSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  duration: z.preprocess(parseNumber, z.number().int('Doit être un nombre entier').min(5, 'Durée minimale de 5 minutes')),
  bufferMinutes: z.preprocess(parseNumber, z.number().int('Doit être un nombre entier').min(0, 'Le temps de battement doit être positif').default(0)),
  price: z.preprocess(parseNumber, z.number().min(0, 'Le prix ne peut pas être négatif')),
  color: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  salonId: z.string(),
})

export type ServiceInput = z.infer<typeof ServiceSchema>
