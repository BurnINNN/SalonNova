'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { markNoShow, cancelAppointment, confirmAppointment } from '@/actions/appointments'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Clock, User, Scissors, Ban, CreditCard, AlertCircle, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface AppointmentDetailsModalProps {
  appointment: any | null
  isOpen: boolean
  onClose: () => void
}

export function AppointmentDetailsModal({ appointment, isOpen, onClose }: AppointmentDetailsModalProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!appointment) return null

  const { id, extendedProps, start, end } = appointment
  const { status, clientName, clientId, serviceName, employeeName, price } = extendedProps || {}

  const handleCheckout = () => {
    onClose()
    router.push(`/caisse?appointmentId=${id}`)
  }

  const handleNoShow = async () => {
    setIsSubmitting(true)
    try {
      await markNoShow(id)
      toast.success('Rendez-vous marqué comme No-Show')
      onClose()
    } catch (error) {
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = async () => {
    setIsSubmitting(true)
    try {
      await cancelAppointment(id)
      toast.success('Rendez-vous annulé')
      onClose()
    } catch (error) {
      toast.error("Erreur lors de l'annulation")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      await confirmAppointment(id)
      toast.success('Rendez-vous confirmé')
      onClose()
    } catch (error) {
      toast.error('Erreur lors de la confirmation')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = () => {
    switch(status) {
      case 'PENDING': return <Badge variant="outline" className="text-orange-500 border-orange-500 bg-orange-50/50 animate-pulse">En attente</Badge>
      case 'SCHEDULED': return <Badge variant="secondary">Prévu</Badge>
      case 'COMPLETED': return <Badge variant="default" className="bg-green-500">Terminé</Badge>
      case 'NO_SHOW': return <Badge variant="destructive">No-Show</Badge>
      case 'CANCELLED': return <Badge variant="outline">Annulé</Badge>
      default: return null
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle>Détails du Rendez-vous</DialogTitle>
            {getStatusBadge()}
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3 text-sm">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-medium">{start ? format(new Date(start), 'dd MMMM yyyy', { locale: fr }) : ''}</p>
              <p className="text-muted-foreground">
                {start ? format(new Date(start), 'HH:mm') : ''} - {end ? format(new Date(end), 'HH:mm') : ''}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 text-sm">
            <User className="w-5 h-5 text-muted-foreground" />
            <div>
              {clientId ? (
                <Link 
                  href={`/clients/${clientId}`} 
                  className="font-medium hover:text-primary hover:underline flex items-center gap-1 transition-colors"
                >
                  {clientName}
                  <ExternalLink className="w-3 h-3" />
                </Link>
              ) : (
                <p className="font-medium">{clientName}</p>
              )}
              <p className="text-muted-foreground">Avec {employeeName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <Scissors className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-medium">{serviceName}</p>
              <p className="text-muted-foreground font-semibold">{price} DH</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2 mt-4">
          {status === 'SCHEDULED' && (
            <Button 
              className="w-full bg-green-600 hover:bg-green-700 text-white" 
              onClick={handleCheckout}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Encaisser le client
            </Button>
          )}
          
          {status === 'SCHEDULED' && (
            <div className="grid grid-cols-2 gap-2 w-full">
              <Button 
                variant="outline" 
                className="text-orange-500 border-orange-500 hover:bg-orange-50"
                onClick={handleNoShow}
                disabled={isSubmitting}
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                No-Show
              </Button>
              <Button 
                variant="outline" 
                className="text-destructive border-destructive hover:bg-destructive/10"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                <Ban className="w-4 h-4 mr-2" />
                Annuler
              </Button>
            </div>
          )}

          {status === 'PENDING' && (
            <div className="grid grid-cols-2 gap-2 w-full">
              <Button 
                className="bg-green-600 hover:bg-green-700 text-white" 
                onClick={handleConfirm}
                disabled={isSubmitting}
              >
                Confirmer
              </Button>
              <Button 
                variant="outline" 
                className="text-destructive border-destructive hover:bg-destructive/10"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Refuser
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
