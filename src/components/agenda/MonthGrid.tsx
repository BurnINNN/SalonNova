'use client'

import { useMemo, useRef, useCallback } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
  format,
  addMonths,
  subMonths,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CalendarEvent {
  id: string
  start: string
  backgroundColor?: string
  extendedProps?: {
    employeeColor?: string
  }
}

interface MonthGridProps {
  selectedDate: Date
  events: CalendarEvent[]
  onDaySelect: (date: Date) => void
  onMonthChange: (date: Date) => void
}

export function MonthGrid({ selectedDate, events, onDaySelect, onMonthChange }: MonthGridProps) {
  const touchStartX = useRef<number | null>(null)

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(selectedDate)
    const monthEnd = endOfMonth(selectedDate)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

    const days: Date[] = []
    let current = calStart
    while (current <= calEnd) {
      days.push(current)
      current = addDays(current, 1)
    }
    return days
  }, [selectedDate])

  // Events par jour (max 4 dots)
  const eventsByDay = useMemo(() => {
    const map = new Map<string, string[]>()
    events.forEach((ev) => {
      const key = format(new Date(ev.start), 'yyyy-MM-dd')
      const colors = map.get(key) || []
      if (colors.length < 4) {
        colors.push(ev.extendedProps?.employeeColor || ev.backgroundColor || 'hsl(var(--primary))')
      }
      map.set(key, colors)
    })
    return map
  }, [events])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const diff = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(diff) > 60) {
      if (diff > 0) {
        onMonthChange(subMonths(selectedDate, 1))
      } else {
        onMonthChange(addMonths(selectedDate, 1))
      }
    }
    touchStartX.current = null
  }, [selectedDate, onMonthChange])

  const weekDayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

  return (
    <div
      className="flex-1 flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Navigation mois */}
      <div className="flex items-center justify-between px-2 py-3">
        <button
          type="button"
          onClick={() => onMonthChange(subMonths(selectedDate, 1))}
          className="p-2 rounded-xl hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="text-base font-bold capitalize text-foreground">
          {format(selectedDate, 'MMMM yyyy', { locale: fr })}
        </h3>
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(selectedDate, 1))}
          className="p-2 rounded-xl hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* En-tête jours de la semaine */}
      <div className="grid grid-cols-7 mb-1">
        {weekDayLabels.map((label, i) => (
          <div
            key={i}
            className="text-center text-[11px] font-semibold text-muted-foreground py-1"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Grille des jours */}
      <div className="grid grid-cols-7 flex-1 gap-px">
        {calendarDays.map((day) => {
          const inMonth = isSameMonth(day, selectedDate)
          const today = isToday(day)
          const dayKey = format(day, 'yyyy-MM-dd')
          const dayEvents = eventsByDay.get(dayKey) || []

          return (
            <button
              key={dayKey}
              type="button"
              onClick={() => onDaySelect(day)}
              className={`
                flex flex-col items-center justify-start pt-1.5 pb-1 gap-0.5 rounded-lg
                transition-all duration-150 min-h-[44px]
                ${inMonth ? '' : 'opacity-30'}
                ${today ? 'bg-primary/[0.06]' : ''}
                hover:bg-secondary/60 active:bg-secondary/80
              `}
            >
              <span className={`
                text-sm sm:text-base font-bold w-9 h-9 flex items-center justify-center rounded-full
                ${today
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-foreground font-semibold'
                }
              `}>
                {format(day, 'd')}
              </span>

              {/* Dots pour les événements */}
              {dayEvents.length > 0 && (
                <div className="flex items-center gap-0.5">
                  {dayEvents.map((color, i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
