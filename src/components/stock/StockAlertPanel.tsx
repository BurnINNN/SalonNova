import { getLowAndRuptureProducts } from '@/actions/stock'
import { StockStatusBadge } from './StockStatusBadge'
import Link from 'next/link'

interface StockAlertPanelProps {
  salonId: string
}

export async function StockAlertPanel({ salonId }: StockAlertPanelProps) {
  const { rupture, bas } = await getLowAndRuptureProducts(salonId)
  const total = rupture.length + bas.length

  if (total === 0) return null

  return (
    <div className="space-y-3">
      {rupture.length > 0 && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-4">
          <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
            🚨 {rupture.length} produit{rupture.length > 1 ? 's' : ''} en rupture
          </p>
          <div className="space-y-1">
            {rupture.map(p => (
              <Link
                key={p.id}
                href={`/stock/products/${p.id}`}
                className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
              >
                <span className="text-sm text-red-700 dark:text-red-300 font-medium">
                  {p.name} {p.brand && `— ${p.brand}`}
                </span>
                <StockStatusBadge
                  currentStock={p.currentStock}
                  minStock={p.minStock}
                  unit={p.unit}
                  showQty
                />
              </Link>
            ))}
          </div>
        </div>
      )}

      {bas.length > 0 && (
        <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950 p-4">
          <p className="text-sm font-semibold text-orange-800 dark:text-orange-200 mb-2">
            ⚠️ {bas.length} produit{bas.length > 1 ? 's' : ''} en stock bas
          </p>
          <div className="space-y-1">
            {bas.map(p => (
              <Link
                key={p.id}
                href={`/stock/products/${p.id}`}
                className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-orange-100 dark:hover:bg-orange-900 transition-colors"
              >
                <span className="text-sm text-orange-700 dark:text-orange-300 font-medium">
                  {p.name} {p.brand && `— ${p.brand}`}
                </span>
                <StockStatusBadge
                  currentStock={p.currentStock}
                  minStock={p.minStock}
                  unit={p.unit}
                  showQty
                />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
