'use client'

import { useState, useTransition } from 'react'
import { updateClient } from '@/actions/clients'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Edit2 } from 'lucide-react'

interface EditClientDialogProps {
  client: {
    id: string
    firstName: string
    lastName: string
    phone: string | null
    whatsappOptOut: boolean
    aiInstructions?: string | null
  }
}

export function EditClientDialog({ client }: EditClientDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Form state
  const [firstName, setFirstName] = useState(client.firstName)
  const [lastName, setLastName] = useState(client.lastName)
  const [phone, setPhone] = useState(client.phone || '')
  const [whatsappOptOut, setWhatsappOptOut] = useState(client.whatsappOptOut)
  const [aiInstructions, setAiInstructions] = useState(client.aiInstructions || '')

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName || !lastName) {
      toast.error('Le prénom et nom sont requis.')
      return
    }

    startTransition(async () => {
      try {
        await updateClient(client.id, {
          firstName,
          lastName,
          phone: phone || undefined,
          whatsappOptOut,
          aiInstructions: aiInstructions || null,
        })
        toast.success('Informations modifiées avec succès ✓')
        setIsOpen(false)
      } catch (err: any) {
        toast.error(err.message || 'Erreur lors de la modification.')
      }
    })
  }

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setIsOpen(true)}
        className="rounded-full shadow-sm hover:bg-primary hover:text-primary-foreground transition-colors"
      >
        <Edit2 className="w-4 h-4 mr-2" />
        Modifier
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[440px] bg-white dark:bg-slate-950 border-border rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Modifier le Client</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Mettez à jour les informations de {client.firstName}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-firstName">Prénom <span className="text-destructive">*</span></Label>
                <Input
                  id="edit-firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Prénom"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lastName">Nom <span className="text-destructive">*</span></Label>
                <Input
                  id="edit-lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Nom"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Téléphone</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+212 6XX XXX XXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-aiInstructions">Consignes spécifiques pour l'IA</Label>
              <textarea
                id="edit-aiInstructions"
                value={aiInstructions}
                onChange={(e) => setAiInstructions(e.target.value)}
                placeholder="Ex: Lui parler uniquement en anglais, proposer un café dès son arrivée..."
                className="w-full min-h-[70px] max-h-[140px] rounded-xl border border-input bg-background/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="flex items-center space-x-2 pt-1">
              <input 
                type="checkbox" 
                id="edit-whatsappOptOut" 
                checked={whatsappOptOut}
                onChange={(e) => setWhatsappOptOut(e.target.checked)}
                className="w-4 h-4 text-primary bg-secondary border-border rounded focus:ring-primary"
              />
              <Label htmlFor="edit-whatsappOptOut" className="text-sm font-normal">Ne pas envoyer de rappels WhatsApp</Label>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl">
                Annuler
              </Button>
              <Button type="submit" disabled={isPending} className="rounded-xl shadow-md shadow-primary/20">
                {isPending ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
