import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import Link from 'next/link'
import { Calendar } from 'lucide-react'

interface UpcomingAppointmentsProps {
  appointments: any[]
}

export function UpcomingAppointments({ appointments }: UpcomingAppointmentsProps) {
  return (
    <div className="glass-card rounded-3xl p-6 flex flex-col h-full min-h-[400px]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold tracking-tight">Prochains RDV</h3>
        <Link href="/agenda" className="text-sm font-medium text-primary hover:underline">
          Agenda
        </Link>
      </div>
      
      {appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground opacity-70 gap-2">
          <Calendar className="w-8 h-8" />
          <p className="text-sm text-center">Aucun rendez-vous à venir aujourd'hui.</p>
        </div>
      ) : (
        <div className="flex-1 space-y-4 overflow-y-auto pr-2">
          {appointments.map((apt) => {
            const time = format(new Date(apt.startTime), 'HH:mm', { locale: fr })
            return (
              <Link href={`/agenda?appointmentId=${apt.id}`} key={apt.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-secondary/50 transition-colors border border-transparent hover:border-border block">
                <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-secondary text-primary font-bold shadow-sm shrink-0">
                  <span className="text-sm">{time.split(':')[0]}</span>
                  <span className="text-xs text-muted-foreground -mt-1">{time.split(':')[1]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{apt.client?.firstName} {apt.client?.lastName || 'Client passager'}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 truncate">
                    <span className="w-2 h-2 rounded-full bg-primary/70"></span>
                    {apt.service?.name || 'Prestation inconnue'}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
