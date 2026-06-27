import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

interface Product {
  id: string
  name: string
  currentStock: number
  minStock: number
  unit: string
}

export function StockAlertBanner({ products }: { products: Product[] }) {
  return (
    <div className="rounded-2xl border border-orange-200 bg-orange-50 dark:border-orange-800/50 dark:bg-orange-950/30 p-5">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-orange-800 dark:text-orange-200 text-sm">
            {products.length} produit{products.length > 1 ? 's' : ''} sous le seuil d'alerte
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {products.map(p => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1.5 text-xs bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 rounded-full px-3 py-1.5 font-medium"
              >
                {p.name}
                <span className="font-bold">({p.currentStock}/{p.minStock} {p.unit})</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
