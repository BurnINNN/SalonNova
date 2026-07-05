import { getDashboardMetrics, getUpcomingAppointments, getWeeklyRevenue } from '@/actions/dashboard'
import { getDailyTransactions } from '@/actions/pos'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { DailyKPIs } from '@/components/dashboard/DailyKPIs'
import { UpcomingAppointments } from '@/components/dashboard/UpcomingAppointments'
import { DailyTransactionsMini } from '@/components/dashboard/DailyTransactionsMini'
import { DateRangeFilter } from '@/components/ui/DateRangeFilter'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'

export default async function DashboardPage({ searchParams }: { searchParams: { range?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const range = searchParams.range || 'today'
  let startDate = startOfDay(new Date())
  const endDate = endOfDay(new Date())

  if (range === '7d') startDate = subDays(new Date(), 7)
  else if (range === '30d') startDate = subDays(new Date(), 30)
  else if (range === '90d') startDate = subDays(new Date(), 90)
  else if (range === '180d') startDate = subDays(new Date(), 180)

  let employee = null
  let metrics = { dailyRevenue: 0, pendingCount: 0, fillRate: 0, completedCount: 0, newClientsCount: 0, totalAppointments: 0 }
  let upcomingAppointments: any[] = []
  let dailyTransactions: any[] = []
  let weeklyRevenue: any[] = []

  if (user) {
    employee = await prisma.employee.findUnique({
      where: { userId: user.id },
      include: { salon: true },
    })
    
    if (employee) {
      const salonId = employee.salonId
      const [m, a, t, w] = await Promise.all([
        getDashboardMetrics(salonId, startDate, endDate),
        getUpcomingAppointments(salonId, 5),
        getDailyTransactions(salonId),
        getWeeklyRevenue(salonId)
      ])
      metrics = m
      upcomingAppointments = a
      dailyTransactions = t
      weeklyRevenue = w
    }
  }

  // Si pas connecté ou pas d'employé, on affiche des fausses données pour le design
  const displayMetrics = employee ? metrics : {
    dailyRevenue: 4250,
    pendingCount: 8,
    fillRate: 75,
    completedCount: 12,
    newClientsCount: 3,
    totalAppointments: 20
  }

  const fallbackWeeklyRevenue = Array.from({ length: 30 }, (_, i) => {
    const d = subDays(new Date(), 29 - i)
    return {
      day: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      revenue: Math.floor(Math.random() * 2500) + 1000
    }
  })
  const displayWeeklyRevenue = employee ? weeklyRevenue : fallbackWeeklyRevenue

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Aperçu</h1>
        <DateRangeFilter />
      </div>
      
      <DailyKPIs metrics={displayMetrics} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="glass-card rounded-3xl p-4 md:p-6 h-[300px] md:h-[400px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-foreground">Revenus du mois</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Évolution des encaissements sur les 30 derniers jours</p>
            </div>
            <select className="bg-transparent border border-border rounded-xl px-3 py-1 text-sm font-medium focus:ring-ring outline-none text-foreground">
              <option>30 derniers jours</option>
            </select>
          </div>
          <div className="flex-1 min-h-0 h-full w-full pt-4">
            <RevenueChart data={displayWeeklyRevenue} />
          </div>
        </div>

        <UpcomingAppointments appointments={employee ? upcomingAppointments : []} />
        
        <DailyTransactionsMini transactions={employee ? dailyTransactions : []} />
      </div>
    </div>
  )
}
