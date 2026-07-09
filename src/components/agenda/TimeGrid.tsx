'use client'

import { useMemo, useRef, useCallback } from 'react'
import { format, parseISO, isSameDay } from 'date-fns'

interface TimeSlot {
  time: string  // "09:00", "09:30", etc.
  hour: number
  minute: number
}

interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  backgroundColor?: string
  borderColor?: string
  extendedProps?: {
    status?: string
    employeeId?: string
    employeeName?: string
    serviceName?: string
    clientId?: string | null
    clientName?: string
    price?: number
    employeeColor?: string
  }
}

interface TimeGridProps {
  selectedDate: Date
  events: CalendarEvent[]
  startTime: string   // "09:00"
  endTime: string     // "22:00"
  onSlotClick: (date: Date) => void
  onEventClick: (eventId: string) => void
}

function generateSlots(startTime: string, endTime: string): TimeSlot[] {
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  const slots: TimeSlot[] = []
  let h = startH
  let m = startM

  while (h < endH || (h === endH && m < endM)) {
    slots.push({
      time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
      hour: h,
      minute: m,
    })
    m += 30
    if (m >= 60) {
      m = 0
      h++
    }
  }
  return slots
}

function getEventStyle(
  event: CalendarEvent,
  startTime: string,
  endTime: string,
) {
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM)

  const evStart = new Date(event.start)
  const evEnd = new Date(event.end)

  const evStartMin = evStart.getHours() * 60 + evStart.getMinutes()
  const evEndMin = evEnd.getHours() * 60 + evEnd.getMinutes()
  const gridStartMin = startH * 60 + startM

  const topPercent = ((evStartMin - gridStartMin) / totalMinutes) * 100
  const heightPercent = ((evEndMin - evStartMin) / totalMinutes) * 100

  return {
    top: `${Math.max(0, topPercent)}%`,
    height: `${Math.min(heightPercent, 100 - topPercent)}%`,
    minHeight: '20px',
  }
}

export function TimeGrid({
  selectedDate,
  events,
  startTime,
  endTime,
  onSlotClick,
  onEventClick,
}: TimeGridProps) {
  const touchStartX = useRef<number | null>(null)
  const slots = useMemo(() => generateSlots(startTime, endTime), [startTime, endTime])

  // Filtrer les événements pour le jour sélectionné
  const dayEvents = useMemo(() => {
    return events.filter((ev) => {
      const evDate = new Date(ev.start)
      return isSameDay(evDate, selectedDate)
    })
  }, [events, selectedDate])

  const handleSlotClick = useCallback(
    (slot: TimeSlot) => {
      const date = new Date(selectedDate)
      date.setHours(slot.hour, slot.minute, 0, 0)
      onSlotClick(date)
    },
    [selectedDate, onSlotClick]
  )

  const getStatusIndicator = (status?: string) => {
    switch (status) {
      case 'PENDING':
        return 'border-l-4 border-l-orange-400 animate-pulse'
      case 'COMPLETED':
        return 'border-l-4 border-l-green-500'
      case 'CANCELLED':
      case 'NO_SHOW':
        return 'border-l-4 border-l-red-400 opacity-50'
      default:
        return 'border-l-4 border-l-transparent'
    }
  }

  // Pourcentage vertical pour n'importe quelle heure
  const getSlotTopPercent = useCallback((slot: TimeSlot) => {
    const [startH, startM] = startTime.split(':').map(Number)
    const [endH, endM] = endTime.split(':').map(Number)
    const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM)
    const slotMinutes = (slot.hour * 60 + slot.minute) - (startH * 60 + startM)
    return (slotMinutes / totalMinutes) * 100
  }, [startTime, endTime])

  return (
    <div className="relative flex-1 overflow-hidden flex bg-background/10 py-4">
      {/* Sidebar des heures (axe des ordonnées) */}
      <div className="w-12 sm:w-14 flex-shrink-0 relative select-none border-r border-border/10 bg-background/5 p-0">
        {slots.map((slot) => {
          const isHour = slot.minute === 0
          if (!isHour) return null
          
          const topPercent = getSlotTopPercent(slot)
          return (
            <span
              key={slot.time}
              className="absolute right-2 -translate-y-1/2 text-[10px] sm:text-xs font-semibold text-muted-foreground/80 dark:text-muted-foreground/60 tracking-tight"
              style={{ top: `${topPercent}%` }}
            >
              {slot.time}
            </span>
          )
        })}
      </div>

      {/* Grille de slots et événements */}
      <div className="relative flex-1 h-full">
        {/* Grille de slots */}
        <div className="h-full flex flex-col">
          {slots.map((slot) => {
            const isHour = slot.minute === 0
            return (
              <button
                key={slot.time}
                type="button"
                onClick={() => handleSlotClick(slot)}
                className={`
                  flex-1 min-h-[18px] border-b transition-colors
                  ${isHour ? 'border-border/60 dark:border-border/40' : 'border-border/25 dark:border-border/15 border-dashed'}
                  hover:bg-primary/[0.04] active:bg-primary/[0.08]
                `}
              />
            )
          })}
        </div>

        {/* Overlay des événements */}
        <div className="absolute inset-0 left-0 right-1 pointer-events-none">
          {dayEvents.map((event) => {
            const style = getEventStyle(event, startTime, endTime)
            const bgColor = event.backgroundColor || 'hsl(var(--primary))'
            const statusClass = getStatusIndicator(event.extendedProps?.status)

            return (
              <button
                key={event.id}
                type="button"
                onClick={() => onEventClick(event.id)}
                className={`
                  absolute left-0 right-0 mx-0.5 rounded-lg overflow-hidden
                  cursor-pointer pointer-events-auto
                  transition-all duration-200
                  hover:scale-[1.01] hover:shadow-lg hover:z-20
                  shadow-sm
                  ${statusClass}
                `}
                style={{
                  ...style,
                  backgroundColor: bgColor,
                }}
              >
                <div className="flex items-center gap-1.5 px-3 py-1 h-full text-white text-[11px] sm:text-xs font-semibold overflow-hidden">
                  <span className="font-bold whitespace-nowrap">
                    {format(new Date(event.start), 'HH:mm')}
                  </span>
                  <span className="opacity-60 font-normal">·</span>
                  <span className="truncate font-bold">
                    {event.extendedProps?.serviceName || ''}
                  </span>
                  <span className="opacity-60 font-normal">·</span>
                  <span className="truncate opacity-90 font-medium">
                    {event.extendedProps?.clientName || event.title}
                  </span>
                </div>
              </button>
            )
          })}

          {/* Ligne "maintenant" */}
          <NowLine
            selectedDate={selectedDate}
            startTime={startTime}
            endTime={endTime}
          />
        </div>
      </div>
    </div>
  )
}

// Ligne rouge indiquant l'heure actuelle
function NowLine({
  selectedDate,
  startTime,
  endTime,
}: {
  selectedDate: Date
  startTime: string
  endTime: string
}) {
  const now = new Date()
  if (!isSameDay(now, selectedDate)) return null

  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const gridStartMin = startH * 60 + startM

  const topPercent = ((nowMinutes - gridStartMin) / totalMinutes) * 100
  if (topPercent < 0 || topPercent > 100) return null

  return (
    <div
      className="absolute left-0 right-0 flex items-center pointer-events-none z-30"
      style={{ top: `${topPercent}%` }}
    >
      <span className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 shadow-sm flex-shrink-0" />
      <span className="flex-1 h-[2px] bg-red-500/70" />
    </div>
  )
}
