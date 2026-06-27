import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Wallet, CreditCard, Banknote } from 'lucide-react'

interface PaymentMethodSelectorProps {
  paymentMethod: 'CASH' | 'CARD' | null
  setPaymentMethod: (method: 'CASH' | 'CARD') => void
  amountPaid: number
  setAmountPaid: (amount: number) => void
  totalAmount: number
  changeGiven: number
}

export function PaymentMethodSelector({
  paymentMethod,
  setPaymentMethod,
  amountPaid,
  setAmountPaid,
  totalAmount,
  changeGiven
}: PaymentMethodSelectorProps) {
  
  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Paiement
          </div>
          <div className="text-xl font-bold">{totalAmount} DH</div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant={paymentMethod === 'CASH' ? 'default' : 'outline'}
            className={`h-16 flex flex-col items-center justify-center gap-1 ${paymentMethod === 'CASH' ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 border-primary' : ''}`}
            onClick={() => {
              setPaymentMethod('CASH')
              if (amountPaid === 0) setAmountPaid(totalAmount)
            }}
          >
            <Banknote className="w-6 h-6" />
            <span className="text-sm font-medium">Espèces</span>
          </Button>
          <Button 
            variant={paymentMethod === 'CARD' ? 'default' : 'outline'}
            className={`h-16 flex flex-col items-center justify-center gap-1 ${paymentMethod === 'CARD' ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 border-primary' : ''}`}
            onClick={() => {
              setPaymentMethod('CARD')
              setAmountPaid(totalAmount)
            }}
          >
            <CreditCard className="w-6 h-6" />
            <span className="text-sm font-medium">Carte Bancaire</span>
          </Button>
        </div>

        {paymentMethod === 'CASH' && (
          <div className="pt-4 border-t border-border/50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="space-y-2">
              <Label>Montant reçu (DH)</Label>
              <div className="flex gap-2">
                <Input 
                  type="number" 
                  className="text-lg font-semibold h-12"
                  value={amountPaid || ''}
                  onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                />
                <div className="grid grid-cols-2 gap-2 shrink-0">
                  <Button variant="secondary" className="h-12" onClick={() => setAmountPaid(totalAmount)}>Exact</Button>
                  <Button variant="secondary" className="h-12" onClick={() => setAmountPaid(amountPaid + 100)}>+100</Button>
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-xl flex items-center justify-between transition-colors duration-300 ${changeGiven > 0 ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-muted border border-border/50 text-foreground'}`}>
              <span className="font-medium">Monnaie à rendre</span>
              <span className="text-xl font-bold">{changeGiven} DH</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
