import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { getAnalytics } from '@/actions/analytics'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { TopList } from '@/components/analytics/TopList'
import { MetricsChart } from '@/components/analytics/MetricsChart'
import { IndirectChargeDialog } from '@/components/finances/IndirectChargeDialog'
import { PrintBilanButton } from '@/components/finances/PrintBilanButton'
import { DateRangeFilter } from '@/components/ui/DateRangeFilter'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'
import { fr } from 'date-fns/locale'

export default async function FinancesPage({ searchParams }: { searchParams: { range?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const employee = await prisma.employee.findUnique({ where: { userId: user.id } })
  if (!employee) return null
  const salonId = employee.salonId
  const range = searchParams.range || '30d'
  let startDate = startOfMonth(new Date())
  const endDate = endOfMonth(new Date())

  if (range === '7d') startDate = subDays(new Date(), 7)
  else if (range === '30d') startDate = subDays(new Date(), 30)
  else if (range === '90d') startDate = subDays(new Date(), 90)
  else if (range === '180d') startDate = subDays(new Date(), 180)

  const data = await getAnalytics(salonId, startDate, endDate)

  // Format data for chart
  const netMargin = data.ca - data.directCharges - data.indirectCharges - data.totalSalaries
  const chartData = [
    { name: 'CA', value: data.ca },
    { name: 'Charges Directes', value: data.directCharges },
    { name: 'Marge Nette', value: netMargin }
  ]

  const monthName = format(new Date(), 'MMMM yyyy', { locale: fr })

  return (
    <div className="p-6 space-y-6 print:p-0 print:space-y-4 print:bg-white print:text-black">
      {/* Styles d'impression en ligne pour forcer la propreté du PDF */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          #printable-bilan, #printable-bilan * { visibility: visible; }
          #printable-bilan { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
          .no-print { display: none !important; }
          .glass-card { border: 1px solid #ccc !important; box-shadow: none !important; background: transparent !important; }
        }
      `}} />

      <div className="flex items-center justify-between no-print flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          Rapports & Finances
        </h1>
        <div className="flex gap-3 items-center">
          <DateRangeFilter />
          <IndirectChargeDialog salonId={salonId} />
          <PrintBilanButton salonId={salonId} />
        </div>
      </div>

      <div id="printable-bilan" className="space-y-6">
        <div className="hidden print:block mb-8 text-center border-b pb-4">
          <h1 className="text-3xl font-bold uppercase tracking-wider">Bilan Mensuel</h1>
          <p className="text-lg text-slate-500 capitalize">{monthName}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <MetricCard label="Chiffre d'Affaires" value={`${data.ca.toFixed(0)} MAD`} accent="green" />
          <MetricCard label="Charges Globales" value={`${data.indirectCharges.toFixed(0)} MAD`} accent="orange" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
          <div className="p-4 rounded-xl glass-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2">Récapitulatif Activité</h2>
            <ul className="space-y-3">
              <li className="flex justify-between">
                <span className="text-muted-foreground">Prestations réalisées</span>
                <span className="font-semibold">{data.appointmentsCount}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">Coût Produits (Direct)</span>
                <span className="font-semibold">{data.directCharges.toFixed(0)} MAD</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">Coût Salaires Fixes</span>
                <span className="font-semibold">{data.totalSalaries.toFixed(0)} MAD</span>
              </li>
            </ul>
          </div>
          
          <div className="p-4 rounded-xl glass-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2">CA par Catégorie</h2>
            {data.categoryStats.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aucune donnée</p>
            ) : (
              <ul className="space-y-3">
                {data.categoryStats.map(c => (
                  <li key={c.name} className="flex justify-between">
                    <span className="text-muted-foreground">{c.name} ({c.volume} actes)</span>
                    <span className="font-semibold">{c.revenue.toFixed(0)} MAD</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="p-4 rounded-xl glass-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">Détail des Charges Indirectes</h2>
          {data.indirectsList.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune charge ajoutée ce mois-ci.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 rounded-tl-lg">Date</th>
                    <th className="px-4 py-2">Nom</th>
                    <th className="px-4 py-2">Description</th>
                    <th className="px-4 py-2">Paiement</th>
                    <th className="px-4 py-2 text-right rounded-tr-lg">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {data.indirectsList.map(c => (
                    <tr key={c.id} className="border-b border-border/50">
                      <td className="px-4 py-2">{format(new Date(c.date), 'dd/MM/yyyy')}</td>
                      <td className="px-4 py-2 font-medium">{c.name}</td>
                      <td className="px-4 py-2 text-muted-foreground">{c.description || '-'}</td>
                      <td className="px-4 py-2">
                        {c.paymentMethod === 'CASH' ? (
                          <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 rounded-full">Espèces (Caisse)</span>
                        ) : c.paymentMethod === 'CARD' ? (
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">Carte / Banque</span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-2 text-right font-bold">{c.amount.toFixed(0)} MAD</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="no-print grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          <TopList title="Top 5 Prestations" items={data.topServices.map(s => ({ name: s.name, value: `${s.revenue.toFixed(0)} MAD`, subValue: `${s.volume} ventes` }))} />
          <TopList title="Top 5 Clients" items={data.topClients.map(c => ({ name: c.name, value: `${c.revenue.toFixed(0)} MAD`, subValue: `${c.visits} visites` }))} />
        </div>
      </div>
    </div>
  )
}
