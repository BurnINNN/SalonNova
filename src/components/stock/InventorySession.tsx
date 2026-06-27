'use client'

import { useState, useTransition } from 'react'
import { updateInventoryLine, closeInventorySession, cancelInventorySession } from '@/actions/stock'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { categoryLabels } from '@/lib/stock/utils'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface InventoryLine {
  id:          string
  productId:   string
  expectedQty: number
  countedQty:  number | null
  product: {
    name:      string
    brand?:    string | null
    category:  string
    unit:      string
  }
}

interface InventorySessionProps {
  sessionId: string
  salonId:   string
  lines:     InventoryLine[]
}

export function InventorySessionComponent({
  sessionId,
  salonId,
  lines,
}: InventorySessionProps) {
  const router    = useRouter()
  const [counts, setCounts]     = useState<Record<string, string>>(
    Object.fromEntries(lines.map(l => [l.id, l.countedQty?.toString() ?? '']))
  )
  const [saving, startSave]     = useTransition()
  const [closing, startClose]   = useTransition()

  const countedCount  = Object.values(counts).filter(v => v !== '').length
  const totalCount    = lines.length
  const progressPct   = Math.round((countedCount / totalCount) * 100)

  // Grouper les lignes par catégorie
  const byCategory = lines.reduce<Record<string, InventoryLine[]>>((acc, l) => {
    const cat = l.product.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(l)
    return acc
  }, {})

  async function handleSaveLine(lineId: string) {
    const val = counts[lineId]
    if (val === '') return
    const qty = parseFloat(val)
    if (isNaN(qty) || qty < 0) return

    startSave(async () => {
      try {
        await updateInventoryLine(lineId, qty)
      } catch (e: any) {
        toast.error('Erreur', { description: e.message })
      }
    })
  }

  async function handleClose() {
    startClose(async () => {
      try {
        await closeInventorySession(sessionId, salonId)
        toast.success('Inventaire clôturé ✓', {
          description: 'Les ajustements de stock ont été appliqués.',
        })
        router.push('/stock')
        router.refresh()
      } catch (e: any) {
        toast.error('Erreur', { description: e.message })
      }
    })
  }

  async function handleCancel() {
    if (!confirm('Annuler cet inventaire ? Aucun stock ne sera modifié.')) return
    await cancelInventorySession(sessionId)
    router.push('/stock')
  }

  return (
    <div className="space-y-6">
      {/* Barre de progression */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Progression : {countedCount} / {totalCount} produits comptés
          </span>
          <Badge variant={progressPct === 100 ? 'default' : 'secondary'}>
            {progressPct}%
          </Badge>
        </div>
        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Lignes par catégorie */}
      {Object.entries(byCategory).map(([cat, catLines]) => (
        <div key={cat}>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
            {categoryLabels[cat] ?? cat}
          </h3>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {catLines.map((line, i) => {
              const counted    = counts[line.id]
              const isCounted  = counted !== ''
              const diff       = isCounted
                ? parseFloat(counted) - line.expectedQty
                : null

              return (
                <div
                  key={line.id}
                  className={`flex items-center gap-4 px-4 py-3
                    ${i > 0 ? 'border-t border-slate-100 dark:border-slate-700' : ''}
                    ${isCounted ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''}`}
                >
                  {/* Produit */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-slate-800 dark:text-slate-100 truncate">
                      {line.product.name}
                    </div>
                    {line.product.brand && (
                      <div className="text-xs text-slate-400">{line.product.brand}</div>
                    )}
                  </div>

                  {/* Stock théorique */}
                  <div className="text-right w-24 hidden sm:block">
                    <div className="text-xs text-slate-400">Théorique</div>
                    <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      {line.expectedQty} {line.product.unit}
                    </div>
                  </div>

                  {/* Saisie quantité comptée */}
                  <div className="w-28">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Compté"
                      className="h-10 text-center text-base"
                      value={counts[line.id]}
                      onChange={e =>
                        setCounts(prev => ({ ...prev, [line.id]: e.target.value }))
                      }
                      onBlur={() => handleSaveLine(line.id)}
                    />
                  </div>

                  {/* Écart */}
                  <div className="w-16 text-right">
                    {diff !== null && (
                      <span className={`text-sm font-bold
                        ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                        {diff > 0 ? `+${diff}` : diff}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          size="lg"
          className="flex-1"
          onClick={handleCancel}
          disabled={closing}
        >
          Annuler l'inventaire
        </Button>
        <Button
          size="lg"
          className="flex-[2]"
          onClick={handleClose}
          disabled={closing || progressPct < 100}
        >
          {closing
            ? 'Clôture en cours…'
            : progressPct < 100
            ? `Compter encore ${totalCount - countedCount} produit(s)`
            : 'Clôturer et appliquer au stock'}
        </Button>
      </div>
    </div>
  )
}
