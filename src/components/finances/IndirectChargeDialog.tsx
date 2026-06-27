'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { addIndirectCharge } from '@/actions/analytics'

export function IndirectChargeDialog({ salonId }: { salonId: string }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | ''>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !amount) {
      toast.error('Le nom et le montant sont requis.')
      return
    }

    setIsSubmitting(true)
    try {
      await addIndirectCharge({
        name,
        description: description || undefined,
        amount: parseFloat(amount),
        paymentMethod: paymentMethod === '' ? undefined : paymentMethod,
        date: new Date(),
        salonId
      })
      toast.success('Charge ajoutée avec succès')
      setOpen(false)
      setName('')
      setDescription('')
      setAmount('')
      setPaymentMethod('')
      router.refresh()
    } catch (error) {
      toast.error("Erreur lors de l'ajout")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="rounded-xl" variant="outline" />}>
        <Plus className="w-4 h-4 mr-2" />
        Ajouter une charge
      </DialogTrigger>
      <DialogContent className="glass-card">
        <DialogHeader>
          <DialogTitle>Ajouter une charge (Loyer, Salaire, Facture...)</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Type de charge / Nom</Label>
            <Input 
              placeholder="Ex: Électricité" 
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input 
              placeholder="Ex: Facture du mois de Juin" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Montant (MAD)</Label>
              <Input 
                type="number" 
                min="0" 
                step="0.01"
                placeholder="Ex: 500" 
                value={amount} 
                onChange={e => setAmount(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Mode de paiement</Label>
              <select
                className="w-full flex h-10 rounded-xl border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as any)}
              >
                <option value="">Sélectionner...</option>
                <option value="CASH">Espèces (Déduit de la Caisse)</option>
                <option value="CARD">Carte Bancaire / Virement</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="mr-2">Annuler</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Ajout...' : 'Ajouter'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
