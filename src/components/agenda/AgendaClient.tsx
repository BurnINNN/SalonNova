'use client'

import { useState, useMemo } from 'react'
import { CustomCalendar } from '@/components/agenda/CustomCalendar'
import { NewAppointmentDialog } from '@/components/agenda/NewAppointmentDialog'
import { AppointmentDetailsModal } from '@/components/agenda/AppointmentDetailsModal'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronLeft, Plus } from 'lucide-react'

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

interface SalonSettings {
  calendarStartTime?: string
  calendarEndTime?: string
  workDays?: number[]
}

interface AgendaClientProps {
  appointments: CalendarEvent[]
  clients: Client[]
  employees: Employee[]
  services: Service[]
  salonId: string
  salonSettings?: SalonSettings
}

export function AgendaClient({
  appointments,
  clients,
  employees,
  services,
  salonId,
  salonSettings,
}: AgendaClientProps) {
  const [currentView, setCurrentView] = useState<'day' | 'month'>('day')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false)
  const [selectedSlotDate, setSelectedSlotDate] = useState<Date | null>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<string>('ALL')

  const startTime = salonSettings?.calendarStartTime || '09:00'
  const endTime = salonSettings?.calendarEndTime || '20:00'

  function handleDateClick(date: Date) {
    setSelectedSlotDate(date)
    setIsNewDialogOpen(true)
  }

  function handleEventClick(appointmentId: string) {
    const apt = appointments.find(a => a.id === appointmentId)
    if (apt) {
      setSelectedAppointment(apt)
      setIsDetailsModalOpen(true)
    }
  }

  function handleBackButton() {
    if (currentView === 'day') {
      setCurrentView('month')
    }
  }

  const filteredAppointments = useMemo(() => {
    if (selectedEmployee === 'ALL') return appointments
    return appointments.filter(a => a.extendedProps?.employeeId === selectedEmployee)
  }, [appointments, selectedEmployee])

  // Titre dynamique selon la vue
  const headerTitle = useMemo(() => {
    if (currentView === 'month') {
      return format(selectedDate, 'MMMM yyyy', { locale: fr })
    }
    return format(selectedDate, 'EEEE d MMMM', { locale: fr })
  }, [currentView, selectedDate])

  return (
    <div className="h-full flex flex-col pb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3 md:mb-4 px-1">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Bouton retour (drill-up) — visible seulement en vue Jour */}
          {currentView === 'day' && (
            <button
              onClick={handleBackButton}
              className="p-2 -ml-1 rounded-xl hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
              title="Vue mois"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground capitalize truncate">
              {headerTitle}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Filtre coiffeur */}
          <select
            className="bg-background border border-border rounded-xl px-2.5 py-2 text-xs sm:text-sm font-medium focus:ring-ring outline-none touch-target max-w-[120px] sm:max-w-none"
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
          >
            <option value="ALL">Tous</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>

          {/* Bouton nouveau RDV */}
          <button
            onClick={() => {
              setSelectedSlotDate(new Date())
              setIsNewDialogOpen(true)
            }}
            className="bg-primary text-primary-foreground p-2.5 sm:px-4 sm:py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm touch-target flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nouveau RDV</span>
          </button>
        </div>
      </div>

      {/* Calendrier */}
      <div className="flex-1 min-h-0">
        <CustomCalendar
          currentView={currentView}
          selectedDate={selectedDate}
          events={filteredAppointments}
          startTime={startTime}
          endTime={endTime}
          onDateClick={handleDateClick}
          onEventClick={handleEventClick}
          onDaySelect={setSelectedDate}
          onViewChange={setCurrentView}
          onMonthChange={setSelectedDate}
        />
      </div>

      <NewAppointmentDialog
        open={isNewDialogOpen}
        onOpenChange={setIsNewDialogOpen}
        clients={clients}
        employees={employees}
        services={services}
        salonId={salonId}
        initialDate={selectedSlotDate}
      />

      <AppointmentDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        appointment={selectedAppointment}
      />
    </div>
  )
}
