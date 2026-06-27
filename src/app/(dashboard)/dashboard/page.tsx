import { getDashboardMetrics, getUpcomingAppointments } from '@/actions/dashboard'
import { getDailyTransactions } from '@/actions/pos'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { DailyKPIs } from '@/components/dashboard/DailyKPIs'
import { UpcomingAppointments } from '@/components/dashboard/UpcomingAppointments'
import { DailyTransactionsMini } from '@/components/dashboard/DailyTransactionsMini'
import { DateRangeFilter } from '@/components/ui/DateRangeFilter'
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

  if (user) {
    employee = await prisma.employee.findUnique({
      where: { userId: user.id },
      include: { salon: true },
    })
    
    if (employee) {
      const salonId = employee.salonId
      const [m, a, t] = await Promise.all([
        getDashboardMetrics(salonId, startDate, endDate),
        getUpcomingAppointments(salonId, 5),
        getDailyTransactions(salonId)
      ])
      metrics = m
      upcomingAppointments = a
      dailyTransactions = t
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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Aperçu</h1>
        <DateRangeFilter />
      </div>
      
      <DailyKPIs metrics={displayMetrics} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart - Temporarily kept as static or pseudo-dynamic */}
        <div className="glass-card rounded-3xl p-6 h-[400px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold tracking-tight">Revenus de la semaine</h3>
            <select className="bg-transparent border border-border rounded-xl px-3 py-1 text-sm font-medium focus:ring-ring outline-none">
              <option>Cette semaine</option>
              <option>Ce mois</option>
            </select>
          </div>
          <div className="flex-1 flex items-end justify-between gap-2 pt-10">
            {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
              <div key={i} className="w-full flex flex-col items-center gap-3 group">
                <div className="w-full bg-secondary rounded-t-xl relative h-full flex items-end">
                  <div 
                    className="w-full bg-primary/80 group-hover:bg-primary transition-all duration-500 rounded-t-xl relative" 
                    style={{ height: `${h}%` }}
                  >
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs py-1 px-2 rounded-lg font-medium transition-opacity whitespace-nowrap">
                      {h * 40} MAD
                    </div>
                  </div>
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <UpcomingAppointments appointments={employee ? upcomingAppointments : []} />
        
        <DailyTransactionsMini transactions={employee ? dailyTransactions : []} />
      </div>
    </div>
  )
}
