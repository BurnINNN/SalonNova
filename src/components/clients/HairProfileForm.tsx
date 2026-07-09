'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { upsertHairProfile } from '@/actions/clients'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

const schema = z.object({
  hairType: z.string().optional(),
  hairCondition: z.string().optional(),
  colorFormula: z.string().optional(),
  sensitiveScalp: z.boolean().optional().default(false),
  allergies: z.string().optional(),
  preferredStyle: z.string().optional(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface HairProfileFormProps {
  clientId: string
  initialData?: FormData | null
}

export function HairProfileForm({ clientId, initialData }: HairProfileFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: initialData ?? {},
  })

  async function onSubmit(values: FormData) {
    try {
      await upsertHairProfile({ clientId, ...values })
      toast.success('Fiche capillaire sauvegardée ✓')
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la sauvegarde.')
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type de cheveux</Label>
          <Input placeholder="Frisés, Lisses, Ondulés…" {...form.register('hairType')} />
        </div>
        <div className="space-y-2">
          <Label>État des cheveux</Label>
          <Input placeholder="Normaux, Colorés, Abîmés…" {...form.register('hairCondition')} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Formule de coloration</Label>
        <Textarea
          placeholder="Ex: 6.0 + 6.34 en parts égales, oxydant 20 vol…"
          rows={3}
          {...form.register('colorFormula')}
        />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          placeholder="Observations, particularités, recommandations…"
          rows={4}
          {...form.register('notes')}
        />
      </div>

      <Button type="submit" size="lg" className="w-full rounded-xl shadow-md shadow-primary/20" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Sauvegarde…' : 'Sauvegarder la fiche'}
      </Button>
    </form>
  )
}
