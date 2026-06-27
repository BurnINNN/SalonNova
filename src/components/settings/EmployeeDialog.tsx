'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { EmployeeForm } from '@/components/settings/EmployeeForm'
import { Plus } from 'lucide-react'

interface EmployeeDialogProps {
  salonId: string
  employee?: any
  trigger?: React.ReactElement
}

export function EmployeeDialog({ salonId, employee, trigger }: EmployeeDialogProps) {
  const [open, setOpen] = useState(false)

  const isEditing = !!employee

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        trigger || (
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium shadow-sm hover:bg-primary/90 transition-all">
            <Plus className="w-4 h-4" />
            Ajouter un membre
          </button>
        )
      } />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? `Modifier ${employee.name}` : 'Nouveau membre'}</DialogTitle>
          {!isEditing && (
            <DialogDescription>Ajoutez un coiffeur ou un manager à votre salon.</DialogDescription>
          )}
        </DialogHeader>

        <EmployeeForm 
          salonId={salonId} 
          employee={employee} 
          onClose={() => setOpen(false)} 
        />
      </DialogContent>
    </Dialog>
  )
}
