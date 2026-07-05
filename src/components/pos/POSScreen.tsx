'use client'

import { useState, useMemo, useEffect } from 'react'
import { ClientSelector } from './ClientSelector'
import { ServiceSelector } from './ServiceSelector'
import { PaymentMethodSelector } from './PaymentMethodSelector'
import { CheckoutButton } from './CheckoutButton'
import { TransactionReceipt } from './TransactionReceipt'
import { createTransaction } from '@/actions/pos'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CheckCircle2 } from 'lucide-react'

export interface POSLine {
  id: string
  label: string
  quantity: number
  unitPrice: number
  totalPrice: number
  serviceId?: string
  productId?: string
}

export function POSScreen({
  salonId,
  activeSession,
  services,
  employees,
  clients,
  initialAppointment
}: any) {
  const [selectedClient, setSelectedClient] = useState<any>(initialAppointment?.client || null)
  const [selectedEmployee, setSelectedEmployee] = useState<any>(initialAppointment?.employee || employees[0])
  const [lines, setLines] = useState<POSLine[]>([])
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | null>(null)
  const [amountPaid, setAmountPaid] = useState<number>(0)
  const [realAmount, setRealAmount] = useState<number>(0)
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [receiptData, setReceiptData] = useState<any>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)

  // Initialization if an appointment is provided via URL
  useEffect(() => {
    if (initialAppointment && initialAppointment.service && lines.length === 0) {
      setLines([{
        id: Math.random().toString(36).substr(2, 9),
        label: initialAppointment.service.name,
        quantity: 1,
        unitPrice: initialAppointment.service.price,
        totalPrice: initialAppointment.service.price,
        serviceId: initialAppointment.service.id
      }])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAppointment])

  // Auto-fill from selected client's appointments (if any for today)
  useEffect(() => {
    if (selectedClient && selectedClient.appointments && selectedClient.appointments.length > 0 && lines.length === 0) {
      const appt = selectedClient.appointments[0]
      if (appt.service) {
        setLines([{
          id: Math.random().toString(36).substr(2, 9),
          label: appt.service.name,
          quantity: 1,
          unitPrice: appt.service.price,
          totalPrice: appt.service.price,
          serviceId: appt.service.id
        }])
        if (appt.employee) {
          setSelectedEmployee(appt.employee)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClient])

  const totalAmount = useMemo(() => lines.reduce((acc, line) => acc + line.totalPrice, 0), [lines])
  const changeGiven = useMemo(() => paymentMethod === 'CASH' ? Math.max(0, amountPaid - realAmount) : 0, [amountPaid, realAmount, paymentMethod])

  // Initialize realAmount and amountPaid when the modal opens
  useEffect(() => {
    if (isPaymentModalOpen) {
      setRealAmount(totalAmount)
      setAmountPaid(totalAmount)
    }
  }, [isPaymentModalOpen, totalAmount])

  const handleAddLine = (line: POSLine) => {
    setLines([...lines, line])
  }

  const handleUpdateLine = (id: string, updates: Partial<POSLine>) => {
    setLines(lines.map(l => l.id === id ? { ...l, ...updates, totalPrice: (updates.unitPrice ?? l.unitPrice) * (updates.quantity ?? l.quantity) } : l))
  }

  const handleRemoveLine = (id: string) => {
    setLines(lines.filter(l => l.id !== id))
  }

  const handleCheckout = async () => {
    if (!activeSession) {
      toast.error('Veuillez ouvrir la caisse avant d\'encaisser')
      return
    }
    if (lines.length === 0) {
      toast.error('Ajoutez au moins une prestation')
      return
    }
    if (!paymentMethod) {
      toast.error('Choisissez un mode de paiement')
      return
    }
    if (paymentMethod === 'CASH' && amountPaid < realAmount) {
      toast.error('Le montant payé est insuffisant')
      return
    }

    setIsSubmitting(true)
    try {
      const transaction = await createTransaction({
        salonId,
        totalAmount,
        amountPaid: paymentMethod === 'CASH' ? amountPaid : realAmount,
        changeGiven,
        paymentMethod,
        clientId: selectedClient?.id,
        employeeId: selectedEmployee?.id,
        appointmentId: initialAppointment?.id,
        discount: 0,
        lines: lines.map(l => ({
          label: l.label,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          totalPrice: l.totalPrice,
          serviceId: l.serviceId,
          productId: l.productId,
        }))
      })

      toast.success('Encaissement réussi')
      setReceiptData({ ...transaction, lines })
      
      // Reset
      setLines([])
      setPaymentMethod(null)
      setAmountPaid(0)
      setSelectedClient(null)
      if (!initialAppointment) setSelectedEmployee(employees[0])

    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'encaissement')
    } finally {
      setIsSubmitting(false)
      setIsPaymentModalOpen(false)
    }
  }

  const [openingBalance, setOpeningBalance] = useState<number>(0)
  const [isOpening, setIsOpening] = useState(false)

  const handleOpenSession = async () => {
    setIsOpening(true)
    try {
      const { openCashRegisterSession } = await import('@/actions/pos')
      await openCashRegisterSession(salonId, openingBalance)
      toast.success('Caisse ouverte avec succès')
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'ouverture")
    } finally {
      setIsOpening(false)
    }
  }

  if (!activeSession) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4 text-center p-4 md:p-8 bg-card rounded-3xl border border-border/50">
        <h2 className="text-xl md:text-2xl font-semibold">Caisse fermée</h2>
        <p className="text-muted-foreground max-w-md text-sm md:text-base">Vous devez ouvrir une session de caisse pour commencer à encaisser les paiements de la journée.</p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-4 w-full sm:w-auto">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">DH</span>
            <input 
              type="number" 
              placeholder="Fond initial" 
              value={openingBalance} 
              onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
              className="flex h-10 w-40 rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <Button size="lg" onClick={handleOpenSession} disabled={isOpening}>
            {isOpening ? 'Ouverture...' : 'Ouvrir la caisse'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 flex-1 h-full pb-10">
      {/* Client & Prestations (Pleine largeur) */}
      <div className="space-y-6">
        <ClientSelector 
          clients={clients} 
          selectedClient={selectedClient} 
          onSelect={setSelectedClient}
          salonId={salonId}
        />
        <ServiceSelector 
          services={services} 
          lines={lines} 
          onAddLine={handleAddLine} 
          onUpdateLine={handleUpdateLine}
          onRemoveLine={handleRemoveLine}
        />
      </div>

      {/* Barre d'action basse pour ouvrir la modale de paiement */}
      {lines.length > 0 && (
        <div className="fixed bottom-4 md:bottom-6 left-4 right-4 md:left-auto md:right-10 z-40 flex justify-center md:justify-end">
          <Button 
            size="lg" 
            className="rounded-full shadow-xl px-8 py-6 text-lg animate-in slide-in-from-bottom-8 gap-2 w-full md:w-auto"
            onClick={() => setIsPaymentModalOpen(true)}
          >
            <CheckCircle2 className="w-6 h-6" />
            Confirmer le panier ({totalAmount} DH)
          </Button>
        </div>
      )}

      {/* Modale de Paiement */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Finaliser l'encaissement</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="bg-muted/30 p-4 rounded-xl space-y-3">
              <div className="flex justify-between items-center text-sm text-muted-foreground border-b border-border/50 pb-2">
                <span>Montant de la prestation</span>
                <span className="font-semibold">{totalAmount} DH</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-foreground">Montant réel payé</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={totalAmount}
                    value={realAmount || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0
                      setRealAmount(val)
                      if (paymentMethod === 'CASH' && amountPaid < val) {
                        setAmountPaid(val)
                      } else if (paymentMethod === 'CARD') {
                        setAmountPaid(val)
                      }
                    }}
                    onBlur={() => {
                      if (realAmount < totalAmount) {
                        setRealAmount(totalAmount)
                        if (paymentMethod === 'CARD' || amountPaid < totalAmount) {
                          setAmountPaid(totalAmount)
                        }
                      }
                    }}
                    className="w-28 text-right font-bold text-xl bg-transparent border-b border-primary focus:outline-none text-primary pr-1 focus:ring-0"
                  />
                  <span className="font-bold text-primary text-xl">DH</span>
                </div>
              </div>
            </div>

            <PaymentMethodSelector 
              paymentMethod={paymentMethod}
              setPaymentMethod={(method) => {
                setPaymentMethod(method)
                if (method === 'CARD') {
                  setAmountPaid(realAmount)
                }
              }}
              amountPaid={amountPaid}
              setAmountPaid={setAmountPaid}
              totalAmount={realAmount}
              changeGiven={changeGiven}
            />

            <CheckoutButton 
              totalAmount={realAmount}
              onCheckout={handleCheckout}
              disabled={lines.length === 0 || !paymentMethod || (paymentMethod === 'CASH' && amountPaid < realAmount)}
              isSubmitting={isSubmitting}
            />
          </div>
        </DialogContent>
      </Dialog>

      {receiptData && (
        <TransactionReceipt 
          data={receiptData} 
          onClose={() => setReceiptData(null)} 
          salonName="Salon Pro"
        />
      )}
    </div>
  )
}
