'use client'

import { DayHeader } from './DayHeader'
import { TimeGrid } from './TimeGrid'
import { MonthGrid } from './MonthGrid'

interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  backgroundColor?: string
  borderColor?: string
  extendedProps?: any
}

interface CustomCalendarProps {
  currentView: 'day' | 'month'
  selectedDate: Date
  events: CalendarEvent[]
  startTime: string
  endTime: string
  onDateClick: (date: Date) => void
  onEventClick: (eventId: string) => void
  onDaySelect: (date: Date) => void
  onViewChange: (view: 'day' | 'month') => void
  onMonthChange: (date: Date) => void
}

export function CustomCalendar({
  currentView,
  selectedDate,
  events,
  startTime,
  endTime,
  onDateClick,
  onEventClick,
  onDaySelect,
  onViewChange,
  onMonthChange,
}: CustomCalendarProps) {
  const handleDaySelectFromMonth = (date: Date) => {
    onDaySelect(date)
    onViewChange('day')
  }

  return (
    <div className="glass-card rounded-2xl md:rounded-3xl h-full flex flex-col shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      {currentView === 'day' && (
        <>
          {/* Header jours de la semaine */}
          <div className="px-2 pt-2 pb-1 pl-12 sm:pl-14 border-b border-border/30 bg-background/30 backdrop-blur-sm">
            <DayHeader
              selectedDate={selectedDate}
              onDaySelect={onDaySelect}
            />
          </div>

          {/* Grille horaire */}
          <TimeGrid
            selectedDate={selectedDate}
            events={events}
            startTime={startTime}
            endTime={endTime}
            onSlotClick={onDateClick}
            onEventClick={onEventClick}
          />
        </>
      )}

      {currentView === 'month' && (
        <div className="flex-1 flex flex-col p-2">
          <MonthGrid
            selectedDate={selectedDate}
            events={events}
            onDaySelect={handleDaySelectFromMonth}
            onMonthChange={onMonthChange}
          />
        </div>
      )}
    </div>
  )
}
