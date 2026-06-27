'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createEmployee, updateEmployee } from '@/actions/employees'
import { X } from 'lucide-react'
import { DialogClose } from '@/components/ui/dialog'

const EmployeeFormSchema = z.object({
  name: z.string().min(2, 'Nom obligatoire'),
  email: z.union([z.literal(''), z.string().email('Email invalide')]).optional().nullable(),
  phone: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  salaryType: z.enum(['FIXED', 'COMMISSION', 'BOTH']).default('COMMISSION'),
  baseSalary: z.coerce.number().min(0).optional().nullable(),
  commissionRate: z.coerce.number().min(0).max(100).optional().nullable(),
  role: z.enum(['MANAGER', 'HAIRDRESSER']).default('HAIRDRESSER'),
})

type EmployeeFormData = z.infer<typeof EmployeeFormSchema>

interface EmployeeFormProps {
  salonId: string
  employee?: any
  onClose: () => void
}

export function EmployeeForm({ salonId, employee, onClose }: EmployeeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = !!employee

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(EmployeeFormSchema) as any,
    defaultValues: {
      name: employee?.name || '',
      email: employee?.email || '',
      phone: employee?.phone || '',
      color: employee?.color || '#3b82f6',
      salaryType: employee?.salaryType || 'COMMISSION',
      baseSalary: employee?.baseSalary || 0,
      commissionRate: employee?.commissionRate || 0,
      role: employee?.role || 'HAIRDRESSER',
    },
  })

  async function onSubmit(data: EmployeeFormData) {
    setIsSubmitting(true)
    try {
      if (isEditing) {
        const employeeData = { ...data, email: data.email || null, salonId }
        await updateEmployee(employee.id, employeeData)
        toast.success('Employé mis à jour')
      } else {
        const employeeData = { ...data, email: data.email || null, salonId }
        await createEmployee(employeeData)
        toast.success('Employé ajouté')
      }
      onClose()
    } catch (error) {
      console.error(error)
      toast.error("Erreur lors de l'enregistrement")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Nom complet</label>
          <input
            {...form.register('name')}
            className="w-full flex h-10 rounded-xl border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Jean Dupont"
          />
          {form.formState.errors.name && (
            <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <input
            {...form.register('email')}
            type="email"
            className="w-full flex h-10 rounded-xl border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="jean@salon.com"
          />
          {form.formState.errors.email && (
            <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Téléphone</label>
          <input
            {...form.register('phone')}
            className="w-full flex h-10 rounded-xl border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="0612345678"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Rôle</label>
          <select
            {...form.register('role')}
            className="w-full flex h-10 rounded-xl border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="HAIRDRESSER">Coiffeur / Employé</option>
            <option value="MANAGER">Manager</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Type de paie</label>
          <select
            {...form.register('salaryType')}
            className="w-full flex h-10 rounded-xl border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="COMMISSION">Commission uniquement</option>
            <option value="FIXED">Salaire Fixe</option>
            <option value="BOTH">Mixte (Fixe + Commission)</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Salaire Fixe (MAD)</label>
          <input
            {...form.register('baseSalary')}
            type="number"
            min="0"
            className="w-full flex h-10 rounded-xl border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Taux de commission (%)</label>
          <input
            {...form.register('commissionRate')}
            type="number"
            min="0"
            max="100"
            className="w-full flex h-10 rounded-xl border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="10"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Couleur (Agenda)</label>
          <div className="flex gap-2">
            <input
              {...form.register('color')}
              type="color"
              className="w-10 h-10 p-0 border-0 rounded overflow-hidden cursor-pointer shrink-0"
            />
            <input
              {...form.register('color')}
              type="text"
              className="flex-1 h-10 rounded-xl border border-input bg-background/50 px-3 py-2 text-sm"
              placeholder="#3b82f6"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
        <DialogClose render={
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-input bg-background hover:bg-accent transition-colors"
          >
            Annuler
          </button>
        } />
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Enregistrement...' : isEditing ? 'Modifier' : 'Ajouter'}
        </button>
      </div>
    </form>
  )
}
