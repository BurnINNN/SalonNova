'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ServiceForm } from './ServiceForm'
import { ServiceCategoryForm } from './ServiceCategoryForm'
import { deleteService } from '@/actions/services'
import { deleteServiceCategory } from '@/actions/serviceCategories'
import { toast } from 'sonner'

interface ServiceListProps {
  initialServices: any[]
  categories: any[]
  salonId: string
}

export function ServiceList({ initialServices, categories, salonId }: ServiceListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingService, setEditingService] = useState<any>(null)

  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<any>(null)

  const handleEdit = (service: any) => {
    setEditingService(service)
    setIsDialogOpen(true)
  }

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) setEditingService(null)
  }

  const handleEditCategory = (category: any) => {
    setEditingCategory(category)
    setIsCategoryDialogOpen(true)
  }

  const handleCategoryOpenChange = (open: boolean) => {
    setIsCategoryDialogOpen(open)
    if (!open) setEditingCategory(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cette prestation ?')) return
    try {
      await deleteService(id, salonId)
      toast.success('Prestation supprimée')
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression')
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cette catégorie ?')) return
    try {
      await deleteServiceCategory(id)
      toast.success('Catégorie supprimée')
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression')
    }
  }

  const renderServiceCard = (service: any) => (
    <Card key={service.id} className="relative overflow-hidden group">
      <div 
        className="absolute top-0 left-0 w-1 h-full" 
        style={{ backgroundColor: service.color || '#3b82f6' }}
      />
      <CardContent className="p-5 pl-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-lg">{service.name}</h3>
            {service.category && (
              <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full inline-block mt-1">
                {service.category.name}
              </span>
            )}
            <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
              <span>{service.duration} min</span>
              {service.bufferMinutes > 0 && (
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full">+{service.bufferMinutes}m</span>
              )}
            </p>
          </div>
          <div className="font-bold text-lg">{service.price} DH</div>
        </div>
        
        {service.description && (
          <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
            {service.description}
          </p>
        )}

        <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(service)}>
            <Edit2 className="w-3.5 h-3.5 mr-2" /> Modifier
          </Button>
          <Button variant="outline" size="sm" className="flex-1 text-destructive hover:text-destructive" onClick={() => handleDelete(service.id)}>
            <Trash2 className="w-3.5 h-3.5 mr-2" /> Supprimer
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-8">
      <div className="flex justify-end gap-3">
        <Dialog open={isCategoryDialogOpen} onOpenChange={handleCategoryOpenChange}>
          <DialogTrigger render={<Button variant="outline" className="gap-2" />}>
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
              onSuccess={() => setIsCategoryDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger render={<Button className="gap-2" />}>
            <Plus className="w-4 h-4" /> Nouvelle Prestation
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingService ? 'Modifier la prestation' : 'Créer une prestation'}
              </DialogTitle>
            </DialogHeader>
            <ServiceForm
              salonId={salonId}
              categories={categories}
              initialData={editingService}
              onSuccess={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-8">
        {categories.map((cat) => {
          const catServices = initialServices.filter((s) => s.categoryId === cat.id)
          return (
            <div key={cat.id} className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: cat.color || '#000' }} />
                  <h2 className="text-xl font-semibold">{cat.name}</h2>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={() => handleEditCategory(cat)}>
                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => handleDeleteCategory(cat.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
              
              {catServices.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {catServices.map(renderServiceCard)}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic py-2">Aucune prestation dans cette catégorie.</p>
              )}
            </div>
          )
        })}

        {initialServices.filter((s) => !s.categoryId).length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-xl font-semibold text-muted-foreground">Sans catégorie</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {initialServices.filter((s) => !s.categoryId).map(renderServiceCard)}
            </div>
          </div>
        )}

        {initialServices.length === 0 && categories.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl">
            Aucune prestation ni catégorie n'a été créée pour le moment.
          </div>
        )}
      </div>
    </div>
  )
}
