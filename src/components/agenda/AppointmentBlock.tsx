import React from 'react'

export function AppointmentBlock({ eventInfo }: { eventInfo: any }) {
  const { event, timeText, view } = eventInfo
  const { extendedProps } = event
  
  if (view?.type === 'dayGridMonth') {
    return (
      <div className="text-[10px] p-0.5 leading-tight text-foreground font-medium truncate flex items-center gap-1">
        <span className="opacity-70 font-normal">{timeText}</span>
        <span>{extendedProps.clientName || event.title}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col text-xs p-1 w-full h-full overflow-hidden leading-tight text-white font-medium">
      <span className="font-semibold truncate">{extendedProps.clientName || event.title}</span>
      <span className="truncate text-[10px] opacity-90">{extendedProps.serviceName}</span>
      <span className="mt-auto text-[10px] opacity-80">{timeText}</span>
    </div>
  )
}
