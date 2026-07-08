'use client'

import { useMemo, useRef, useCallback } from 'react'
import {
  startOfWeek,
  addDays,
  isSameDay,
  isToday,
  format,
} from 'date-fns'
import { fr } from 'date-fns/locale'

interface DayHeaderProps {
  selectedDate: Date
  onDaySelect: (date: Date) => void
}

export function DayHeader({ selectedDate, onDaySelect }: DayHeaderProps) {
  const touchStartX = useRef<number | null>(null)

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 }) // Lundi
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [selectedDate])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const diff = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(diff) > 60) {
      // Swipe droite → semaine précédente, gauche → suivante
      const offset = diff > 0 ? -7 : 7
      onDaySelect(addDays(selectedDate, offset))
    }
    touchStartX.current = null
  }, [selectedDate, onDaySelect])

  return (
    <div
      className="flex items-stretch gap-0 w-full select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {weekDays.map((day) => {
        const selected = isSameDay(day, selectedDate)
        const today = isToday(day)
        const dayLabel = format(day, 'EEEEE', { locale: fr }).toUpperCase() // L, M, M, J, V, S, D
        const dayNum = format(day, 'd')

        return (
          <button
            key={day.toISOString()}
            type="button"
            onClick={() => onDaySelect(day)}
            className={`
              flex-1 flex flex-col items-center gap-0.5 py-2 transition-all duration-200 rounded-xl
              ${selected ? '' : 'hover:bg-secondary/50'}
            `}
          >
            <span className={`text-[11px] font-semibold tracking-wide ${
              selected ? 'text-primary' : 'text-muted-foreground'
            }`}>
              {dayLabel}
            </span>
            <span className={`
              w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-all duration-200
              ${selected
                ? 'bg-primary text-primary-foreground shadow-md'
                : today
                  ? 'text-primary font-extrabold'
                  : 'text-foreground'
              }
            `}>
              {dayNum}
            </span>
            {/* Dot indicator pour aujourd'hui (quand pas sélectionné) */}
            {today && !selected && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            )}
            {/* Spacer pour maintenir l'alignement quand pas today */}
            {(!today || selected) && (
              <span className="w-1.5 h-1.5" />
            )}
          </button>
        )
      })}
    </div>
  )
}
