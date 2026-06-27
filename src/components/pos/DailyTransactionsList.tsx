'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Ban, ExternalLink } from 'lucide-react'
import { cancelTransaction } from '@/actions/pos'
import { toast } from 'sonner'
import Link from 'next/link'

interface DailyTransactionsListProps {
  transactions: any[]
}

export function DailyTransactionsList({ transactions }: DailyTransactionsListProps) {
  const [cancelReason, setCancelReason] = useState('')
  const [cancelingId, setCancelingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCancel = async (id: string) => {
    if (!cancelReason.trim()) {
      toast.error('Le motif est obligatoire')
      return
    }
    
    setIsSubmitting(true)
    try {
      await cancelTransaction(id, cancelReason)
      toast.success('Transaction annulée')
      setCancelingId(null)
      setCancelReason('')
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'annulation')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {transactions.length === 0 ? (
        <div className="text-center p-8 text-muted-foreground border rounded-2xl bg-muted/20">
          Aucune transaction pour aujourd'hui.
        </div>
      ) : (
        transactions.map((t) => (
          <Card key={t.id} className={`overflow-hidden transition-all ${t.cancelledAt ? 'opacity-60 grayscale' : ''}`}>
            <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-lg">{t.totalAmount} DH</span>
                  <Badge variant={t.paymentMethod === 'CASH' ? 'default' : 'secondary'}>
                    {t.paymentMethod === 'CASH' ? 'Espèces' : 'Carte'}
                  </Badge>
                  {t.cancelledAt && (
                    <Badge variant="destructive">Annulé</Badge>
                  )}
                  <span className="text-sm text-muted-foreground ml-auto">
                    {format(new Date(t.createdAt), 'HH:mm', { locale: fr })}
                  </span>
                </div>
                
                <p className="text-sm">
                  <span className="font-medium text-foreground">
                    {t.client ? `${t.client.firstName} ${t.client.lastName}` : 'Client passager'}
                  </span>
                  <span className="text-muted-foreground mx-2">•</span>
                  <span className="text-muted-foreground">
                    {t.lines.map((l: any) => l.label).join(', ')}
                  </span>
                </p>

                {t.appointmentId && (
                  <Link href={`/agenda?appointmentId=${t.appointmentId}`} className="text-xs text-primary hover:underline flex items-center gap-1 mt-2">
                    <ExternalLink className="w-3 h-3" /> Voir le rendez-vous lié
                  </Link>
                )}
                
                {t.cancelledAt && (
                  <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                    <Ban className="w-3 h-3" />
                    Motif : {t.cancelReason}
                  </p>
                )}
              </div>

              {!t.cancelledAt && (
                <Dialog open={cancelingId === t.id} onOpenChange={(open) => {
                  if (!open) {
                    setCancelingId(null)
                    setCancelReason('')
                  } else {
                    setCancelingId(t.id)
                  }
                }}>
                  <DialogTrigger render={<Button variant="outline" size="sm" className="text-destructive hover:text-destructive shrink-0" />}>
                    <Ban className="w-4 h-4 mr-2" /> Annuler
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Annuler la transaction</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <p className="text-sm text-muted-foreground">
                        Cette action est irréversible. Le montant sera déduit du chiffre d'affaires et les produits vendus seront remis en stock.
                      </p>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Motif de l'annulation *</label>
                        <Input 
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          placeholder="Ex: Erreur de saisie, client remboursé..."
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setCancelingId(null)}>Fermer</Button>
                        <Button 
                          variant="destructive" 
                          onClick={() => handleCancel(t.id)}
                          disabled={isSubmitting || !cancelReason.trim()}
                        >
                          {isSubmitting ? 'Annulation...' : 'Confirmer l\'annulation'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
