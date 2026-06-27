import { z } from 'zod'
import { parseNumber } from './utils'

export const ProductSchema = z.object({
  name:         z.string({ message: 'Nom requis' }).min(1, 'Nom requis'),
  brand:        z.string().optional(),
  reference:    z.string().optional(),
  description:  z.string().optional(),
  category:     z.enum(['COLORANT','SOIN','COIFFANT','SHAMPOING','OUTIL','REVENTE','AUTRE']),
  unit:         z.string().optional().default('unité'),
  currentStock: z.preprocess(parseNumber, z.number().min(0).default(0)),
  minStock:     z.preprocess(parseNumber, z.number().min(0).default(1)),
  purchasePrice:z.preprocess(parseNumber, z.number().min(0).default(0)),
  sellingPrice: z.preprocess(parseNumber, z.number().min(0).optional()),
  salonId:      z.string(),
})

export const ProductFormSchema = ProductSchema.omit({ salonId: true })

export type ProductInput = z.infer<typeof ProductSchema>

export const MovementSchema = z.object({
  productId: z.string(),
  type:      z.enum(['ENTREE','SORTIE','RETOUR','AJUSTEMENT']),
  quantity:  z.preprocess(parseNumber, z.number().positive('La quantité doit être positive')),
  unitCost:  z.preprocess(parseNumber, z.number().min(0).optional()),
  reason:    z.string().optional(),
  salonId:   z.string(),
})

export type MovementInput = z.infer<typeof MovementSchema>
