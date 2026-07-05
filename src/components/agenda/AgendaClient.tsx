'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import { NewAppointmentDialog } from '@/components/agenda/NewAppointmentDialog'
import { AppointmentDetailsModal } from '@/components/agenda/AppointmentDetailsModal'

const CalendarView = dynamic(() => import('@/components/agenda/CalendarView').then((mod) => mod.CalendarView), {
  ssr: false,
  loading: () => (
    <div className="h-full min-h-[500px] flex items-center justify-center bg-background/40 backdrop-blur-md rounded-3xl border border-border/50 shadow-inner">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">Chargement du calendrier...</span>
      </div>
    </div>
  )
})

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

interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  backgroundColor?: string
  extendedProps?: any
}

interface AgendaClientProps {
  appointments: CalendarEvent[]
  clients: Client[]
  employees: Employee[]
  services: Service[]
  salonId: string
}

export function AgendaClient({
  appointments,
  clients,
  employees,
  services,
  salonId,
}: AgendaClientProps) {
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)

  const [selectedEmployee, setSelectedEmployee] = useState<string>('ALL')

  function handleDateClick(date: Date) {
    setSelectedDate(date)
    setIsNewDialogOpen(true)
  }

  function handleEventClick(appointmentId: string) {
    const apt = appointments.find(a => a.id === appointmentId)
    if (apt) {
      setSelectedAppointment(apt)
      setIsDetailsModalOpen(true)
    }
  }

  const filteredAppointments = selectedEmployee === 'ALL' 
    ? appointments 
    : appointments.filter(a => a.extendedProps?.employeeId === selectedEmployee)

  return (
    <div className="h-full flex flex-col pb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 md:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Agenda Intelligent</h1>
          <select 
            className="bg-background border border-border rounded-xl px-3 py-2 text-sm font-medium focus:ring-ring outline-none touch-target"
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
          >
            <option value="ALL">Tous les coiffeurs</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => {
            setSelectedDate(new Date())
            setIsNewDialogOpen(true)
          }}
          className="w-full sm:w-auto bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm touch-target"
        >
          + Nouveau Rendez-vous
        </button>
      </div>
      <div className="flex-1 min-h-[350px] md:min-h-[600px]">
        <CalendarView
          appointments={filteredAppointments}
          onDateClick={handleDateClick}
          onEventClick={handleEventClick}
        />
      </div>

      <NewAppointmentDialog
        open={isNewDialogOpen}
        onOpenChange={setIsNewDialogOpen}
        clients={clients}
        employees={employees}
        services={services}
        salonId={salonId}
        initialDate={selectedDate}
      />

      <AppointmentDetailsModal 
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        appointment={selectedAppointment}
      />
    </div>
  )
}
