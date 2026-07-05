import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { getActiveSession, getDailyTransactions } from '@/actions/pos'
import { getServices } from '@/actions/services'
import { POSScreen } from '@/components/pos/POSScreen'
import { DailyTransactionsList } from '@/components/pos/DailyTransactionsList'
import { CashRegisterCloseDialog } from '@/components/pos/CashRegisterCloseDialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { History } from 'lucide-react'

export default async function CaissePage({
  searchParams
}: {
  searchParams: { appointmentId?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const employee = await prisma.employee.findUnique({ where: { userId: user.id } })
  if (!employee) return null

  const salonId = employee.salonId

  const [activeSession, services, employees, clients, dailyTransactions] = await Promise.all([
    getActiveSession(salonId),
    getServices(salonId),
    prisma.employee.findMany({ where: { salonId } }),
    prisma.client.findMany({ 
      where: { salonId },
      orderBy: { lastName: 'asc' },
      take: 100,
      include: {
        appointments: {
          where: {
            status: 'SCHEDULED',
            startTime: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lte: new Date(new Date().setHours(23, 59, 59, 999))
            }
          },
          include: { service: true, employee: true }
        }
      }
    }),
    getDailyTransactions(salonId)
  ])

  let appointment = null
  if (searchParams.appointmentId) {
    appointment = await prisma.appointment.findUnique({
      where: { id: searchParams.appointmentId, salonId },
      include: { client: true, service: true, employee: true }
    })
  }

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Caisse
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {activeSession ? 'Session de caisse ouverte' : 'Caisse fermée — Veuillez ouvrir la caisse pour encaisser'}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Dialog>
            <DialogTrigger render={<Button variant="outline" />}>
              <History className="w-4 h-4 mr-2" /> Historique du jour
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Transactions du jour</DialogTitle>
              </DialogHeader>
              <DailyTransactionsList transactions={dailyTransactions} />
            </DialogContent>
          </Dialog>
          {activeSession && (
            <CashRegisterCloseDialog session={activeSession} salonId={salonId} />
          )}
        </div>
      </div>

      <POSScreen 
        salonId={salonId}
        activeSession={activeSession}
        services={services}
        employees={employees}
        clients={clients}
        initialAppointment={appointment}
      />
    </div>
  )
}
