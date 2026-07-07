'use client'

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import frLocale from '@fullcalendar/core/locales/fr'
import { useEffect, useState } from 'react'

import { AppointmentBlock } from './AppointmentBlock'

interface CalendarViewProps {
  appointments: Array<{
    id: string
    title: string
    start: string
    end: string
    backgroundColor?: string
    extendedProps?: any
  }>
  onDateClick: (date: Date) => void
  onEventClick: (appointmentId: string) => void
}

export function CalendarView({ appointments, onDateClick, onEventClick }: CalendarViewProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  // Custom styles for FullCalendar to match our premium beige/white theme
  useEffect(() => {
    const style = document.createElement('style')
    style.innerHTML = `
      .fc {
        --fc-border-color: hsl(var(--border));
        --fc-button-bg-color: hsl(var(--primary));
        --fc-button-border-color: hsl(var(--primary));
        --fc-button-hover-bg-color: hsl(var(--primary) / 0.9);
        --fc-button-hover-border-color: hsl(var(--primary) / 0.9);
        --fc-button-active-bg-color: hsl(var(--primary) / 0.8);
        --fc-event-border-color: rgba(255, 255, 255, 0.4);
        --fc-page-bg-color: transparent;
        --fc-neutral-bg-color: hsl(var(--secondary) / 0.5);
        --fc-today-bg-color: hsl(var(--primary) / 0.05);
        font-family: inherit;
      }
      .fc-theme-standard .fc-scrollgrid { border-radius: 1rem; overflow: hidden; border: 2px solid var(--fc-border-color); }
      .fc-header-toolbar { padding-bottom: 1rem; }
      .fc-toolbar-title { font-size: 1.25rem !important; font-weight: 700 !important; color: hsl(var(--foreground)); text-transform: capitalize; }
      .fc-button { border-radius: 0.75rem !important; text-transform: capitalize; padding: 0.5rem 1rem !important; font-weight: 500 !important; transition: all 0.2s; }
      .fc-button-primary:not(:disabled).fc-button-active, .fc-button-primary:not(:disabled):active {
        box-shadow: none !important;
      }
      .fc-event { border-radius: 0.5rem; border: 2px solid rgba(0,0,0,0.15) !important; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: transform 0.2s; cursor: pointer; }
      .fc-event:hover { transform: scale(1.02); z-index: 5; border-color: rgba(0,0,0,0.3) !important; }
      .fc-col-header-cell { padding: 12px 0; background: hsl(var(--secondary) / 0.3); border-bottom: 2px solid var(--fc-border-color) !important; }
      .fc-col-header-cell-cushion { font-weight: 600; color: hsl(var(--muted-foreground)); text-decoration: none !important; }
      .fc-col-header-cell-cushion:hover { color: hsl(var(--primary)); }
      .fc-timegrid-slot-label-cushion { font-size: 0.75rem; color: hsl(var(--muted-foreground)); font-weight: 500; }
      .fc-daygrid-day:hover { background: hsl(var(--primary) / 0.03); cursor: pointer; }
      .fc-timegrid-slot:hover { background: hsl(var(--primary) / 0.03); cursor: pointer; }
      /* Sticky header for scrollable time grid */
      .fc .fc-scrollgrid-section-header { position: sticky; top: 0; z-index: 10; }
      .fc .fc-col-header { position: sticky; top: 0; z-index: 10; }
      /* Week view: larger slot labels */
      .fc-timeGridWeek-view .fc-timegrid-slot-label-cushion { font-size: 0.8rem; }
      /* Month view: compact dots */
      .fc-dayGridMonth-view .fc-daygrid-event { margin: 1px 2px !important; }
      .fc-dayGridMonth-view .fc-event { border: none !important; box-shadow: none; background: transparent !important; }
      .fc-dayGridMonth-view .fc-event:hover { transform: none; }
    `
    document.head.appendChild(style)
    return () => { document.head.removeChild(style) }
  }, [])

  return (
    <div className="glass-card rounded-2xl md:rounded-3xl p-3 md:p-6 h-full shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={isMobile ? 'timeGridDay' : 'timeGridWeek'}
        locale={frLocale}
        headerToolbar={isMobile ? {
          left: 'prev,next',
          center: 'title',
          right: 'timeGridDay,timeGridWeek,dayGridMonth',
        } : {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        buttonText={{
          today: "Aujourd'hui",
          month: isMobile ? 'M' : 'Mois',
          week: isMobile ? 'S' : 'Semaine',
          day: isMobile ? 'J' : 'Jour',
        }}
        views={{
          timeGridWeek: {
            slotDuration: '01:00:00',
            slotLabelInterval: '01:00:00',
          },
          timeGridDay: {
            titleFormat: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
            slotDuration: '00:30:00',
          },
          dayGridMonth: {
            dayMaxEventRows: 4,
          },
        }}
        slotMinTime="08:00:00"
        slotMaxTime="20:00:00"
        slotDuration="00:30:00"
        allDaySlot={false}
        navLinks={true}
        navLinkDayClick="timeGridDay"
        stickyHeaderDates={true}
        events={appointments}
        editable={!isMobile}
        selectable={true}
        dateClick={(info) => onDateClick(info.date)}
        eventClick={(info) => onEventClick(info.event.id)}
        eventContent={(eventInfo) => <AppointmentBlock eventInfo={eventInfo} />}
        height="100%"
        timeZone="local"
        longPressDelay={300}
      />
    </div>
  )
}
