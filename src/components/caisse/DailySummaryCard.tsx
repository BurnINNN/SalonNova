'use client'

import { useState, useEffect } from 'react'
import { getDailyChargeBreakdown } from '@/actions/charges'
import { BarChart3, TrendingDown, TrendingUp, Package, Zap, ArrowDown } from 'lucide-react'

interface DailySummaryCardProps {
  salonId: string
  date?: string
}

interface BreakdownData {
  ca: number
  directCharges: number
  operationalCharges: number
  indirectCharges: number
  netResult: number
  transactionCount: number
  byCategory: { name: string; color: string | null; total: number }[]
}

export function DailySummaryCard({ salonId, date }: DailySummaryCardProps) {
  const [data, setData] = useState<BreakdownData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (salonId) {
      setIsLoading(true)
      getDailyChargeBreakdown(salonId, date).then((result) => {
        setData(result)
        setIsLoading(false)
      })
    }
  }, [salonId, date])

  if (isLoading) {
    return (
      <div className="glass-card p-5 animate-pulse">
        <div className="h-4 bg-secondary/50 rounded w-32 mb-4" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-3 bg-secondary/30 rounded w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (!data || data.transactionCount === 0) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Bilan du Jour</h3>
        </div>
        <p className="text-xs text-muted-foreground">Aucune transaction aujourd'hui.</p>
      </div>
    )
  }

  const totalCharges = data.directCharges + data.operationalCharges + data.indirectCharges
  const isPositive = data.netResult >= 0

  return (
    <div className="glass-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Bilan du Jour</h3>
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          {data.transactionCount} prestation{data.transactionCount > 1 ? 's' : ''}
        </span>
      </div>

      {/* CA */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <TrendingUp className="w-3.5 h-3.5 text-green-500" />
          <span className="text-muted-foreground">CA Total</span>
        </div>
        <span className="text-sm font-bold text-green-600">
          +{data.ca.toFixed(0)} DH
        </span>
      </div>

      {/* Charges directes (produits) */}
      {data.directCharges > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Package className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-muted-foreground">Produits consommés</span>
          </div>
          <span className="text-sm font-semibold text-orange-500">
            -{data.directCharges.toFixed(0)} DH
          </span>
        </div>
      )}

      {/* Charges opérationnelles */}
      {data.operationalCharges > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-muted-foreground">Charges opérationnelles</span>
          </div>
          <span className="text-sm font-semibold text-amber-500">
            -{data.operationalCharges.toFixed(0)} DH
          </span>
        </div>
      )}

      {/* Détail par catégorie */}
      {data.byCategory.length > 0 && (
        <div className="pl-6 space-y-1">
          {data.byCategory.map((cat, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color || '#94a3b8' }}
                />
                <span className="text-muted-foreground">{cat.name}</span>
              </div>
              <span className="font-medium text-muted-foreground">
                -{cat.total.toFixed(0)} DH
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Charges indirectes */}
      {data.indirectCharges > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <ArrowDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-muted-foreground">Charges indirectes</span>
          </div>
          <span className="text-sm font-semibold text-slate-500">
            -{data.indirectCharges.toFixed(0)} DH
          </span>
        </div>
      )}

      {/* Séparateur + Résultat net */}
      <div className="border-t border-border/50 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isPositive ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
            <span className="text-sm font-bold text-foreground">Résultat Net</span>
          </div>
          <span className={`text-base font-extrabold ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
            {data.netResult >= 0 ? '+' : ''}{data.netResult.toFixed(0)} DH
          </span>
        </div>
      </div>
    </div>
  )
}
