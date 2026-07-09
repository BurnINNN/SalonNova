'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createProduct, updateProduct } from '@/actions/stock'
import { ProductFormSchema } from '@/lib/validations/stock'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { categoryLabels, categoryOrder } from '@/lib/stock/utils'

type ProductFormData = z.infer<typeof ProductFormSchema>

interface ProductFormProps {
  salonId:      string
  initialData?: ProductFormData & { id: string }
}

export function ProductForm({ salonId, initialData }: ProductFormProps) {
  const router    = useRouter()
  const isEditing = !!initialData

  const form = useForm<ProductFormData>({
    resolver: zodResolver(ProductFormSchema) as any,
    defaultValues: initialData ?? {
      name: '',
      brand: '',
      reference: '',
      description: '',
      category: 'AUTRE',
      unit: 'unité',
      currentStock: 0,
      minStock: 0,
      purchasePrice: 0,
      sellingPrice: 0,
    },
  })

  async function onSubmit(values: ProductFormData) {
    try {
      if (isEditing) {
        // currentStock is not editable directly in update, so we omit it
        const { currentStock, ...updateData } = values
        await updateProduct(initialData.id, updateData)
        toast.success('Produit mis à jour ✓')
      } else {
        await createProduct({ ...values, salonId })
        toast.success('Produit créé ✓')
      }
      router.push('/stock')
      router.refresh()
    } catch (e: any) {
      toast.error('Erreur', { description: e.message })
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Nom */}
        <div className="space-y-2">
          <Label>Nom du produit *</Label>
          <Input placeholder="Ex: Majirel 6.0" {...form.register('name')} />
          {form.formState.errors.name && (
            <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>
          )}
        </div>

        {/* Marque */}
        <div className="space-y-2">
          <Label>Marque</Label>
          <Input placeholder="Ex: L'Oréal" {...form.register('brand')} />
        </div>

        {/* Prix (Prix de revente) */}
        <div className="space-y-2 md:col-span-2">
          <Label>Prix (MAD) *</Label>
          <Input type="number" step="0.01" min="0" placeholder="0.00" {...form.register('sellingPrice')} />
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <Button variant="outline" type="button" onClick={() => router.back()} className="flex-1">
          Annuler
        </Button>
        <Button type="submit" disabled={form.formState.isSubmitting} className="flex-[2]">
          {form.formState.isSubmitting ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Créer le produit'}
        </Button>
      </div>
    </form>
  )
}
