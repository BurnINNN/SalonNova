import { getStockStatus, stockStatusConfig, categoryLabels, categoryOrder, formatMAD } from '@/lib/stock/utils'
import { StockStatusBadge } from './StockStatusBadge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface Product {
  id:            string
  name:          string
  brand?:        string | null
  category:      string
  unit:          string
  currentStock:  number
  minStock:      number
  purchasePrice: number
  isActive:      boolean
}

interface ProductTableProps {
  products:        Product[]
  showArchived?:   boolean
}

export function ProductTable({ products, showArchived = false }: ProductTableProps) {
  const filtered = showArchived ? products : products.filter(p => p.isActive)

  return (
    <div className="space-y-6">
      {categoryOrder.map(cat => {
        const catProducts = filtered.filter(p => p.category === cat)
        if (catProducts.length === 0) return null

        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                {categoryLabels[cat]}
              </h3>
              <span className="text-xs text-slate-400">({catProducts.length})</span>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto -mx-1 md:mx-0">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-slate-50 dark:bg-slate-800/60">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-slate-600 dark:text-slate-300">Produit</th>
                    <th className="text-center px-4 py-2.5 font-medium text-slate-600 dark:text-slate-300">Statut</th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-600 dark:text-slate-300">Stock</th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-600 dark:text-slate-300">Seuil</th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-600 dark:text-slate-300">CUMP</th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-600 dark:text-slate-300">Valeur</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {catProducts.map((p, i) => (
                    <tr
                      key={p.id}
                      className={`border-t border-slate-100 dark:border-slate-700/60
                        hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors
                        ${!p.isActive ? 'opacity-50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 dark:text-slate-100">{p.name}</div>
                        {p.brand && <div className="text-xs text-slate-400 mt-0.5">{p.brand}</div>}
                        {!p.isActive && (
                          <span className="text-xs text-slate-400 italic">Archivé</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StockStatusBadge
                          currentStock={p.currentStock}
                          minStock={p.minStock}
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200">
                        {p.currentStock} {p.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-400">
                        {p.minStock} {p.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500">
                        {formatMAD(p.purchasePrice)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-200">
                        {formatMAD(p.currentStock * p.purchasePrice)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/stock/products/${p.id}`}>
                          <Button variant="ghost" size="sm">Gérer →</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
