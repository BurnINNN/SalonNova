import { DollarSign, Users, UserPlus } from 'lucide-react'
import { MetricCard } from './MetricCard'

interface DailyKPIsProps {
  metrics: {
    dailyRevenue: number
    pendingCount: number
    fillRate: number
    completedCount: number
    newClientsCount: number
    totalAppointments: number
  }
}

export function DailyKPIs({ metrics }: DailyKPIsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <MetricCard
        label="CA du jour"
        value={`${metrics.dailyRevenue} DH`}
        accent="green"
        icon={<DollarSign className="w-5 h-5" />}
        sub="Basé sur la caisse"
      />
      <MetricCard
        label="RDV du jour"
        value={metrics.totalAppointments}
        accent="orange"
        icon={<Users className="w-5 h-5" />}
        sub={`${metrics.pendingCount} en attente, ${metrics.completedCount} terminés`}
      />

      <MetricCard
        label="Nouveaux Clients"
        value={metrics.newClientsCount}
        accent="purple"
        icon={<UserPlus className="w-5 h-5" />}
        sub="Enregistrés aujourd'hui"
      />
    </div>
  )
}
