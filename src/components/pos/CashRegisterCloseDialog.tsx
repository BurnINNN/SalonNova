'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { closeCashRegisterSession, getDailySummary } from '@/actions/pos'
import { Lock, Calculator, Banknote, CreditCard, Loader2 } from 'lucide-react'
import { DailySummaryCard } from '@/components/caisse/DailySummaryCard'

export function CashRegisterCloseDialog({ session, salonId }: any) {
  const [isOpen, setIsOpen] = useState(false)
  const [physicalBalance, setPhysicalBalance] = useState<number | ''>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [summary, setSummary] = useState<any>(null)

  useEffect(() => {
    if (isOpen && session) {
      getDailySummary(salonId, session.openedAt).then(setSummary)
    }
  }, [isOpen, session, salonId])

  const expectedClosingBalance = session ? session.openingBalance + (summary?.totalCash || 0) : 0
  const discrepancy = typeof physicalBalance === 'number' ? physicalBalance - expectedClosingBalance : 0

  const handleClose = async () => {
    if (typeof physicalBalance !== 'number') {
      toast.error('Veuillez saisir le montant compté')
      return
    }

    setIsSubmitting(true)
    try {
      await closeCashRegisterSession(session.id, physicalBalance)
      toast.success('Caisse clôturée avec succès')
      setIsOpen(false)
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la clôture')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!session) return null

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button variant="outline" className="text-destructive hover:text-destructive border-destructive/20 bg-destructive/5" />}>
        <Lock className="w-4 h-4 mr-2" /> Clôturer la caisse
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Clôture de la caisse</DialogTitle>
        </DialogHeader>

        {!summary ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted p-4 rounded-xl space-y-1">
                <span className="text-sm text-muted-foreground flex items-center gap-1"><Banknote className="w-3 h-3"/> Total Espèces</span>
                <p className="text-xl font-bold">{summary.totalCash} DH</p>
              </div>
              <div className="bg-muted p-4 rounded-xl space-y-1">
                <span className="text-sm text-muted-foreground flex items-center gap-1"><CreditCard className="w-3 h-3"/> Total CB</span>
                <p className="text-xl font-bold">{summary.totalCard} DH</p>
              </div>
            </div>

            <DailySummaryCard salonId={salonId} date={session.openedAt.toISOString()} />

            <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fond de caisse initial</span>
                <span className="font-medium">{session.openingBalance} DH</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">+ Encaissements espèces</span>
                <span className="font-medium">{summary.totalCash} DH</span>
              </div>
              <div className="pt-3 border-t border-primary/10 flex justify-between">
                <span className="font-semibold text-primary">Montant théorique en caisse</span>
                <span className="font-bold text-lg text-primary">{expectedClosingBalance} DH</span>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="physicalBalance" className="text-base flex items-center gap-2">
                <Calculator className="w-4 h-4" /> Montant compté physiquement
              </Label>
              <div className="flex items-center gap-4">
                <Input 
                  id="physicalBalance"
                  type="number"
                  className="text-lg h-12 w-full font-bold"
                  value={physicalBalance}
                  onChange={(e) => setPhysicalBalance(e.target.value ? parseFloat(e.target.value) : '')}
                  placeholder="0.00"
                />
                <span className="text-muted-foreground font-medium">DH</span>
              </div>
              
              {typeof physicalBalance === 'number' && (
                <div className={`p-3 rounded-lg text-sm flex items-center justify-between ${discrepancy === 0 ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                  <span>Écart constaté</span>
                  <span className="font-bold">{discrepancy > 0 ? '+' : ''}{discrepancy} DH</span>
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-border">
              <Button variant="outline" onClick={() => setIsOpen(false)}>Annuler</Button>
              <Button 
                onClick={handleClose} 
                disabled={isSubmitting || typeof physicalBalance !== 'number'}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Valider la clôture
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
