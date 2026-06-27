import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { startInventorySession } from '@/actions/stock'
import { InventorySessionComponent } from '@/components/stock/InventorySession'
import { Button } from '@/components/ui/button'
import { redirect } from 'next/navigation'

export default async function InventoryPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const employee = await prisma.employee.findUnique({ where: { userId: user.id } })
  if (!employee) return null

  // Vérifier s'il y a une session en cours
  const activeSession = await prisma.inventorySession.findFirst({
    where: { salonId: employee.salonId, status: 'IN_PROGRESS' },
    include: {
      lines: {
        include: { product: true },
        orderBy: [
          { product: { category: 'asc' } },
          { product: { name: 'asc' } },
        ],
      },
    },
  })

  // Historique des inventaires précédents
  const pastSessions = await prisma.inventorySession.findMany({
    where: { salonId: employee.salonId, status: { in: ['CLOSED', 'CANCELLED'] } },
    orderBy: { startedAt: 'desc' },
    take: 5,
  })

  async function handleStart() {
    'use server'
    await startInventorySession(employee!.salonId, user!.id)
    redirect('/stock/inventory')
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
        Inventaire physique
      </h1>

      {activeSession ? (
        <>
          <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 p-4">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              📋 Inventaire en cours — démarré le{' '}
              {new Date(activeSession.startedAt).toLocaleDateString('fr-MA')}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Saisissez la quantité réelle de chaque produit. Les écarts seront
              calculés automatiquement à la clôture.
            </p>
          </div>

          <InventorySessionComponent
            sessionId={activeSession.id}
            salonId={employee.salonId}
            lines={activeSession.lines}
          />
        </>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-6 text-center space-y-4">
            <div className="text-4xl">📦</div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Aucun inventaire en cours
            </h2>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Lancez un inventaire complet pour compter vos produits et synchroniser
              le stock théorique avec la réalité.
            </p>
            <form action={handleStart}>
              <Button size="lg" type="submit" className="mt-2">
                Démarrer un inventaire
              </Button>
            </form>
          </div>

          {pastSessions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Inventaires précédents
              </h3>
              <div className="space-y-2">
                {pastSessions.map(s => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-3 rounded-lg border
                               border-slate-100 dark:border-slate-800"
                  >
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {new Date(s.startedAt).toLocaleDateString('fr-MA', {
                        day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </span>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full
                      ${s.status === 'CLOSED'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : 'bg-slate-100 text-slate-500'}`}>
                      {s.status === 'CLOSED' ? 'Clôturé' : 'Annulé'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
