import { z } from 'zod'

export const TransactionLineSchema = z.object({
  label: z.string(),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
  totalPrice: z.number().min(0),
  serviceId: z.string().optional(),
  productId: z.string().optional(),
})

export type TransactionLineInput = z.infer<typeof TransactionLineSchema>

export const CreateTransactionSchema = z.object({
  salonId: z.string(),
  totalAmount: z.number().min(0),
  amountPaid: z.number().min(0),
  paymentMethod: z.enum(['CASH', 'CARD']),
  clientId: z.string().optional().nullable(),
  employeeId: z.string().optional().nullable(),
  appointmentId: z.string().optional().nullable(),
  discount: z.number().default(0),
  discountReason: z.string().optional(),
  lines: z.array(TransactionLineSchema).min(1, 'Au moins une ligne requise'),
})

export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>
