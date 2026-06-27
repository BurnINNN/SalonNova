import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { getStockDashboardMetrics } from '@/actions/stock'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { StockAlertPanel } from '@/components/stock/StockAlertPanel'
import { ProductTable } from '@/components/stock/ProductTable'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function StockPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const employee = await prisma.employee.findUnique({ where: { userId: user.id } })
  if (!employee) return null

  const [products, metrics] = await Promise.all([
    prisma.product.findMany({
      where: { salonId: employee.salonId },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    }),
    getStockDashboardMetrics(employee.salonId),
  ])

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          Stock
        </h1>
        <div className="flex gap-2 flex-wrap">
          <Link href="/stock/inventory">
            <Button variant="outline">Inventaire physique</Button>
          </Link>
          <Link href="/stock/products/new">
            <Button size="lg">+ Ajouter un produit</Button>
          </Link>
        </div>
      </div>

      {/* Métriques */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          label="Valeur du stock"
          value={`${metrics.totalValue.toFixed(0)} MAD`}
          accent="green"
        />
        <MetricCard
          label="Produits actifs"
          value={metrics.productCount}
          accent="blue"
        />
        <MetricCard
          label="Stock bas"
          value={metrics.basCount}
          accent={metrics.basCount > 0 ? 'orange' : 'green'}
        />
        <MetricCard
          label="Ruptures"
          value={metrics.ruptureCount}
          accent={metrics.ruptureCount > 0 ? 'orange' : 'green'}
        />
      </div>

      {/* Alertes */}
      <StockAlertPanel salonId={employee.salonId} />

      {/* Tableau produits */}
      <ProductTable products={products as any} />
    </div>
  )
}
