import React from 'react'

export function AppointmentBlock({ eventInfo }: { eventInfo: any }) {
  const { event, timeText, view } = eventInfo
  const { extendedProps } = event
  
  // Month view: colored dots only
  if (view?.type === 'dayGridMonth') {
    const dotColor = extendedProps.employeeColor || event.backgroundColor || 'hsl(var(--primary))'
    return (
      <div className="flex items-center justify-center p-0" title={`${extendedProps.clientName || event.title} — ${extendedProps.serviceName || ''}`}>
        <span 
          className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" 
          style={{ backgroundColor: dotColor }}
        />
      </div>
    )
  }

  // Week view: service name only, employee color is the background
  if (view?.type === 'timeGridWeek') {
    return (
      <div className="flex flex-col text-xs p-1 w-full h-full overflow-hidden leading-tight text-white font-medium">
        <span className="font-semibold truncate">{extendedProps.serviceName || event.title}</span>
        <span className="mt-auto text-[10px] opacity-80">{timeText}</span>
      </div>
    )
  }

  // Day view: full details (client + service + time)
  return (
    <div className="flex flex-col text-xs p-1 w-full h-full overflow-hidden leading-tight text-white font-medium">
      <span className="font-semibold truncate">{extendedProps.clientName || event.title}</span>
      <span className="truncate text-[10px] opacity-90">{extendedProps.serviceName}</span>
      <span className="mt-auto text-[10px] opacity-80">{timeText}</span>
    </div>
  )
}
