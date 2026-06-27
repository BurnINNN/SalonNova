import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, Copy, RefreshCcw } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'

interface TransactionReceiptProps {
  data: any
  onClose: () => void
  salonName: string
}

export function TransactionReceipt({ data, onClose, salonName }: TransactionReceiptProps) {
  const handlePrint = () => {
    window.print()
  }

  const handleCopy = () => {
    const text = `
Ticket de caisse - ${salonName}
Date : ${format(new Date(data.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
------------------------
${data.lines.map((l: any) => `${l.quantity}x ${l.label} : ${l.totalPrice} DH`).join('\n')}
------------------------
TOTAL : ${data.totalAmount} DH
Paiement : ${data.paymentMethod === 'CASH' ? 'Espèces' : 'Carte'}
Reçu : ${data.amountPaid} DH
Rendu : ${data.changeGiven} DH

Merci de votre visite !
    `.trim()
    
    navigator.clipboard.writeText(text)
    toast.success('Ticket copié dans le presse-papiers')
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">Encaissement réussi</DialogTitle>
        </DialogHeader>

        <div className="bg-white text-black p-6 rounded-lg font-mono text-sm border-2 border-dashed border-gray-300 print:border-none print:p-0 my-4">
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold">{salonName}</h2>
            <p className="text-gray-500 mt-1">{format(new Date(data.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}</p>
          </div>

          <div className="space-y-3 mb-6">
            {data.lines.map((line: any, i: number) => (
              <div key={i} className="flex justify-between">
                <div>
                  <span className="text-gray-500 mr-2">{line.quantity}x</span>
                  <span>{line.label}</span>
                </div>
                <span className="font-semibold">{line.totalPrice} DH</span>
              </div>
            ))}
          </div>

          <div className="border-t-2 border-dashed border-gray-300 pt-4 space-y-2">
            <div className="flex justify-between text-lg font-bold">
              <span>TOTAL</span>
              <span>{data.totalAmount} DH</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Payé en {data.paymentMethod === 'CASH' ? 'Espèces' : 'Carte'}</span>
              <span>{data.amountPaid} DH</span>
            </div>
            {data.changeGiven > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Monnaie rendue</span>
                <span>{data.changeGiven} DH</span>
              </div>
            )}
          </div>
          
          <div className="text-center mt-8 text-gray-400 text-xs">
            Merci de votre visite !
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="w-full" onClick={handleCopy}>
            <Copy className="w-4 h-4 mr-2" /> Copier texte
          </Button>
          <Button variant="outline" className="w-full" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Imprimer
          </Button>
          <Button variant="default" className="w-full col-span-2 mt-2" onClick={onClose}>
            <RefreshCcw className="w-4 h-4 mr-2" /> Nouvel encaissement
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
