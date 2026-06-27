'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ServiceCategoryForm } from './ServiceCategoryForm'
import { deleteServiceCategory } from '@/actions/serviceCategories'
import { toast } from 'sonner'

interface ServiceCategoryListProps {
  initialCategories: any[]
  salonId: string
}

export function ServiceCategoryList({ initialCategories, salonId }: ServiceCategoryListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<any>(null)

  const handleEdit = (category: any) => {
    setEditingCategory(category)
    setIsDialogOpen(true)
  }

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) setEditingCategory(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cette catégorie ?')) return
    try {
      await deleteServiceCategory(id)
      toast.success('Catégorie supprimée')
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger render={<Button className="gap-2" />}>
            <Plus className="w-4 h-4" /> Nouvelle Catégorie
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'Modifier la catégorie' : 'Créer une catégorie'}
              </DialogTitle>
            </DialogHeader>
            <ServiceCategoryForm
              salonId={salonId}
              initialData={editingCategory}
              onSuccess={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {initialCategories.map((category) => (
          <Card key={category.id} className="relative overflow-hidden group">
            <div 
              className="absolute top-0 left-0 w-1 h-full" 
              style={{ backgroundColor: category.color || '#3b82f6' }}
            />
            <CardContent className="p-5 pl-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{category.name}</h3>
                </div>
              </div>
              
              <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(category)}>
                  <Edit2 className="w-3.5 h-3.5 mr-2" /> Modifier
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-destructive hover:text-destructive" onClick={() => handleDelete(category.id)}>
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Supprimer
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {initialCategories.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            Aucune catégorie n'a été créée pour le moment.
          </div>
        )}
      </div>
    </div>
  )
}
