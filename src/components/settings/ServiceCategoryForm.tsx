'use client'

import { useState } from 'react'
import { createServiceCategory, updateServiceCategory } from '@/actions/serviceCategories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface ServiceCategoryFormProps {
  salonId: string
  initialData?: any
  onSuccess: () => void
}

export function ServiceCategoryForm({ salonId, initialData, onSuccess }: ServiceCategoryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [name, setName] = useState(initialData?.name || '')
  const [color, setColor] = useState(initialData?.color || '#000000')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      if (initialData?.id) {
        await updateServiceCategory(initialData.id, { name, color })
        toast.success('Catégorie modifiée avec succès')
      } else {
        await createServiceCategory({ name, color, salonId })
        toast.success('Catégorie créée avec succès')
      }
      onSuccess()
    } catch (error: any) {
      toast.error(error.message || 'Une erreur est survenue')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nom de la catégorie *</Label>
        <Input 
          id="name" 
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ex: Coiffure, Soins" 
          required 
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="color">Couleur</Label>
        <Input 
          id="color" 
          type="color" 
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-10 p-1" 
        />
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  )
}
