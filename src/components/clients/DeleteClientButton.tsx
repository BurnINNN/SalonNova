'use client'

import { useState, useTransition } from 'react'
import { deleteClient } from '@/actions/clients'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

interface DeleteClientButtonProps {
  clientId: string
  salonId: string
}

export function DeleteClientButton({ clientId, salonId }: DeleteClientButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteClient(clientId, salonId)
        toast.success('Client supprimé avec succès.')
        setIsOpen(false)
        router.push('/clients')
        router.refresh()
      } catch (error: any) {
        console.error(error)
        toast.error(error.message || 'Erreur lors de la suppression du client.')
        setIsOpen(false)
      }
    })
  }

  return (
    <>
      <Button
        variant="destructive"
        className="rounded-2xl gap-2 font-medium"
        onClick={() => setIsOpen(true)}
      >
        <Trash2 className="w-4 h-4" />
        Supprimer le client
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Supprimer le client</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer définitivement ce client ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
              className="rounded-xl"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
              className="rounded-xl"
            >
              {isPending ? 'Suppression...' : 'Confirmer la suppression'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
