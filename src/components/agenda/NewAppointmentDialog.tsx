'use client'

import { useState, useTransition } from 'react'
import { createAppointment } from '@/actions/appointments'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface Client {
  id: string
  firstName: string
  lastName: string
}

interface Employee {
  id: string
  name: string
}

interface Service {
  id: string
  name: string
  duration: number
  price: number
}

interface NewAppointmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clients: Client[]
  employees: Employee[]
  services: Service[]
  salonId: string
  initialDate: Date | null
}

export function NewAppointmentDialog({
  open,
  onOpenChange,
  clients,
  employees,
  services,
  salonId,
  initialDate,
}: NewAppointmentDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [clientId, setClientId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')
  const [clientSearch, setClientSearch] = useState('')

  // Pre-fill date when dialog opens with a date from calendar
  const effectiveDate = date || (initialDate ? initialDate.toISOString().split('T')[0] : '')
  const effectiveTime = time || (initialDate ? `${String(initialDate.getHours()).padStart(2, '0')}:${String(initialDate.getMinutes()).padStart(2, '0')}` : '')

  const selectedService = services.find(s => s.id === serviceId)
  
  const filteredClients = clientSearch
    ? clients.filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(clientSearch.toLowerCase())
      )
    : clients

  function resetForm() {
    setClientId('')
    setEmployeeId('')
    setServiceId('')
    setDate('')
    setTime('')
    setNotes('')
    setClientSearch('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const finalDate = date || effectiveDate
    const finalTime = time || effectiveTime

    if (!clientId || !employeeId || !serviceId || !finalDate || !finalTime) {
      toast.error('Veuillez remplir tous les champs obligatoires.')
      return
    }

    const startTime = new Date(`${finalDate}T${finalTime}:00`)

    startTransition(async () => {
      try {
        await createAppointment({
          clientId,
          employeeId,
          serviceId,
          startTime: startTime.toISOString(),
          salonId,
          notes: notes || undefined,
          bookedVia: 'MANUAL',
        })
        toast.success('Rendez-vous créé avec succès ✓')
        resetForm()
        onOpenChange(false)
      } catch (err: any) {
        toast.error(err.message || 'Erreur lors de la création du rendez-vous.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-white dark:bg-slate-950 border-border rounded-3xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">
            Nouveau Rendez-vous
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Planifiez un rendez-vous pour un client.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {/* Client Search + Select */}
          <div className="space-y-2">
            <Label htmlFor="client" className="text-sm font-medium">
              Client <span className="text-destructive">*</span>
            </Label>
            <Input
              id="client-search"
              placeholder="Rechercher un client..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              className="mb-2"
            />
            <select
              id="client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              required
            >
              <option value="">Sélectionner un client</option>
              {filteredClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </select>
          </div>

          {/* Employee */}
          <div className="space-y-2">
            <Label htmlFor="employee" className="text-sm font-medium">
              Coiffeur / Coiffeuse <span className="text-destructive">*</span>
            </Label>
            <select
              id="employee"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              required
            >
              <option value="">Sélectionner un employé</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          {/* Service */}
          <div className="space-y-2">
            <Label htmlFor="service" className="text-sm font-medium">
              Prestation <span className="text-destructive">*</span>
            </Label>
            <select
              id="service"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              required
            >
              <option value="">Sélectionner une prestation</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.duration} min — {s.price} MAD
                </option>
              ))}
            </select>
            {selectedService && (
              <p className="text-xs text-muted-foreground mt-1">
                Durée : {selectedService.duration} min · Prix : {selectedService.price} MAD
              </p>
            )}
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-sm font-medium">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="date"
                type="date"
                value={date || effectiveDate}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time" className="text-sm font-medium">
                Heure <span className="text-destructive">*</span>
              </Label>
              <Input
                id="time"
                type="time"
                value={time || effectiveTime}
                onChange={(e) => setTime(e.target.value)}
                min="08:00"
                max="19:30"
                step="1800"
                required
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Instructions particulières, remarques..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="rounded-xl shadow-md shadow-primary/20"
            >
              {isPending ? 'Création...' : 'Créer le rendez-vous'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
