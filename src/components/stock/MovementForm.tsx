'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { recordMovement } from '@/actions/stock'
import { MovementSchema } from '@/lib/validations/stock'
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

type MovementFormData = z.infer<typeof MovementSchema>

interface MovementFormProps {
  productId:    string
  salonId:      string
  unit:         string
  currentStock: number
  onSuccess?:   () => void
}

const typeLabels = {
  ENTREE:      'Entrée — achat / approvisionnement',
  SORTIE:      'Sortie — consommation / perte',
  RETOUR:      'Retour fournisseur',
  AJUSTEMENT:  'Ajustement manuel',
}

export function MovementForm({
  productId,
  salonId,
  unit,
  currentStock,
  onSuccess,
}: MovementFormProps) {
  const form = useForm<MovementFormData>({
    resolver: zodResolver(MovementSchema) as any,
    defaultValues: { type: 'ENTREE', quantity: 1 },
  })

  const selectedType = form.watch('type')
  const isEntree = selectedType === 'ENTREE'

  async function onSubmit(values: MovementFormData) {
    try {
      await recordMovement({ ...values, productId, salonId })
      toast.success('Mouvement enregistré ✓')
      form.reset()
      onSuccess?.()
    } catch (e: any) {
      toast.error('Erreur', { description: e.message })
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
      {/* Type de mouvement */}
      <div className="space-y-2">
        <Label>Type de mouvement</Label>
        <Select
          value={form.watch('type')}
          onValueChange={v => form.setValue('type', v as any)}
        >
          <SelectTrigger className="h-12 text-base">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(typeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Quantité */}
      <div className="space-y-2">
        <Label>
          Quantité ({unit})
          {(selectedType === 'SORTIE' || selectedType === 'RETOUR') && (
            <span className="text-slate-400 text-xs ml-2">
              Stock actuel : {currentStock} {unit}
            </span>
          )}
        </Label>
        <Input
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0"
          className="h-12 text-base"
          {...form.register('quantity')}
        />
        {form.formState.errors.quantity && (
          <p className="text-xs text-red-500">{form.formState.errors.quantity.message}</p>
        )}
      </div>


      {/* Raison */}
      <div className="space-y-2">
        <Label>Note (optionnel)</Label>
        <Textarea
          placeholder="Ex: Reçu de Mohamed, flacon cassé, correction inventaire…"
          rows={2}
          {...form.register('reason')}
        />
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full h-12 text-base"
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? 'Enregistrement…' : 'Enregistrer le mouvement'}
      </Button>
    </form>
  )
}
