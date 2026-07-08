'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { saveServiceCharges, getChargeCategories } from '@/actions/charges'
import { toast } from 'sonner'
import { Receipt, ChevronRight } from 'lucide-react'

interface ChargeCategory {
  id: string
  name: string
  icon: string | null
  color: string | null
}

interface ServiceChargesModalProps {
  isOpen: boolean
  onClose: () => void
  transactionId: string
  salonId: string
}

export function ServiceChargesModal({
  isOpen,
  onClose,
  transactionId,
  salonId,
}: ServiceChargesModalProps) {
  const [categories, setCategories] = useState<ChargeCategory[]>([])
  const [charges, setCharges] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isOpen && salonId) {
      setIsLoading(true)
      getChargeCategories(salonId).then((cats) => {
        setCategories(cats)
        // Init charges à 0
        const init: Record<string, number> = {}
        cats.forEach(c => { init[c.id] = 0 })
        setCharges(init)
        setNotes({})
        setIsLoading(false)
      })
    }
  }, [isOpen, salonId])

  const totalCharges = Object.values(charges).reduce((sum, v) => sum + (v || 0), 0)

  async function handleSubmit() {
    setIsSubmitting(true)
    try {
      const chargeEntries = Object.entries(charges)
        .filter(([_, amount]) => amount > 0)
        .map(([categoryId, amount]) => ({
          categoryId,
          amount,
          notes: notes[categoryId] || undefined,
        }))

      if (chargeEntries.length > 0) {
        await saveServiceCharges({
          transactionId,
          salonId,
          charges: chargeEntries,
        })
        toast.success('Charges enregistrées')
      }
      onClose()
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement des charges")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Receipt className="w-4 h-4" />
            </div>
            <DialogTitle>Charges de cette prestation</DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Estimez les charges opérationnelles pour cette prestation.
          </p>
        </DialogHeader>

        <div className="space-y-3 py-4 max-h-[50vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              Chargement des catégories...
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <p className="text-sm text-muted-foreground">
                Aucune catégorie de charges créée.
              </p>
              <p className="text-xs text-muted-foreground">
                Créez des catégories dans <span className="font-medium">Réglages → Charges</span>
              </p>
            </div>
          ) : (
            categories.map(cat => (
              <div key={cat.id} className="flex items-center gap-3 group">
                {/* Icône / Couleur */}
                <span className="text-xl w-8 text-center flex-shrink-0">
                  {cat.icon || '📦'}
                </span>
                {/* Nom */}
                <span className="text-sm font-medium flex-1 min-w-0 truncate">
                  {cat.name}
                </span>
                {/* Input montant */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={charges[cat.id] || ''}
                    onChange={(e) =>
                      setCharges(prev => ({
                        ...prev,
                        [cat.id]: parseFloat(e.target.value) || 0,
                      }))
                    }
                    placeholder="0"
                    className="w-20 h-9 text-right text-sm font-semibold rounded-lg border border-input bg-background/50 px-2 focus:ring-2 focus:ring-ring outline-none transition-colors"
                  />
                  <span className="text-xs text-muted-foreground font-medium">DH</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Total */}
        {categories.length > 0 && (
          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-secondary/30 border border-border/50">
            <span className="text-sm font-semibold text-foreground">Total charges</span>
            <span className="text-base font-bold text-foreground">
              {totalCharges.toFixed(0)} DH
            </span>
          </div>
        )}

        <DialogFooter className="flex-row gap-2 mt-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={isSubmitting}
          >
            Passer
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-primary"
            disabled={isSubmitting || categories.length === 0}
          >
            <ChevronRight className="w-4 h-4 mr-1" />
            {isSubmitting ? 'Enregistrement...' : 'Valider'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
