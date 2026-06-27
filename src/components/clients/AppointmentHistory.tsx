import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const statusConfig: Record<string, { label: string; variant: 'outline' | 'default' | 'destructive' | 'secondary'; color: string }> = {
  SCHEDULED: { label: 'Planifié', variant: 'outline', color: 'text-blue-600' },
  COMPLETED: { label: 'Effectué', variant: 'default', color: 'text-green-600' },
  NO_SHOW: { label: 'No-show', variant: 'destructive', color: 'text-red-600' },
  CANCELLED: { label: 'Annulé', variant: 'secondary', color: 'text-muted-foreground' },
}

interface Appointment {
  id: string
  startTime: Date
  status: string
  service: { name: string; price: number }
  employee: { name: string }
}

export function AppointmentHistory({ appointments }: { appointments: Appointment[] }) {
  if (appointments.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-10 text-sm">
        Aucun rendez-vous enregistré
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {appointments.map(apt => {
        const cfg = statusConfig[apt.status] ?? statusConfig.SCHEDULED
        return (
          <div
            key={apt.id}
            className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-background/50 hover:bg-secondary/50 transition-colors"
          >
            <div>
              <p className="font-medium text-sm text-foreground">
                {apt.service.name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(new Date(apt.startTime), 'PPP', { locale: fr })} · {apt.employee.name}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-foreground">
                {apt.service.price} MAD
              </span>
              <Badge variant={cfg.variant}>{cfg.label}</Badge>
            </div>
          </div>
        )
      })}
    </div>
  )
}
