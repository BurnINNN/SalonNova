'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createService, updateService } from '@/actions/services'
import { ServiceSchema } from '@/lib/validations/services'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type FormData = z.infer<typeof ServiceSchema>

interface ServiceFormProps {
  salonId: string
  categories: any[]
  initialData?: any
  onSuccess: () => void
}

export function ServiceForm({ salonId, categories, initialData, onSuccess }: ServiceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(ServiceSchema) as any,
    defaultValues: {
      name: initialData?.name || '',
      duration: initialData?.duration || 30,
      bufferMinutes: initialData?.bufferMinutes || 0,
      price: initialData?.price || 0,
      color: initialData?.color || '#3b82f6',
      description: initialData?.description || '',
      categoryId: initialData?.categoryId || null,
      isActive: initialData?.isActive ?? true,
      salonId,
    },
  })

  async function onSubmit(data: FormData) {
    setIsSubmitting(true)
    try {
      if (initialData?.id) {
        await updateService(initialData.id, data)
        toast.success('Prestation modifiée avec succès')
      } else {
        await createService(data)
        toast.success('Prestation créée avec succès')
      }
      onSuccess()
    } catch (error: any) {
      toast.error(error.message || 'Une erreur est survenue')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nom de la prestation *</Label>
        <Input id="name" {...form.register('name')} placeholder="ex: Coupe Homme" />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="categoryId">Catégorie</Label>
        <Controller
          name="categoryId"
          control={form.control}
          render={({ field }) => (
            <Select
              value={field.value || 'none'}
              onValueChange={(val) => field.onChange(val === 'none' ? null : val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune catégorie</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color || '#000' }} />
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Prix (MAD) *</Label>
          <Input id="price" type="number" step="0.01" {...form.register('price')} />
          {form.formState.errors.price && (
            <p className="text-sm text-destructive">{form.formState.errors.price.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="color">Couleur (Agenda)</Label>
          <Input id="color" type="color" {...form.register('color')} className="h-10 p-1" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="duration">Durée (minutes) *</Label>
          <Input id="duration" type="number" {...form.register('duration')} />
          {form.formState.errors.duration && (
            <p className="text-sm text-destructive">{form.formState.errors.duration.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="bufferMinutes">Battement (minutes)</Label>
          <Input id="bufferMinutes" type="number" {...form.register('bufferMinutes')} />
          <p className="text-xs text-muted-foreground">Temps de repos ou nettoyage.</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optionnelle)</Label>
        <Textarea id="description" {...form.register('description')} placeholder="Détails visibles en caisse ou réservation" />
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  )
}
