// ── Statut visuel dérivé du stock ─────────────────────────────────────────

export type StockStatus = 'OK' | 'BAS' | 'RUPTURE'

export function getStockStatus(currentStock: number, minStock: number): StockStatus {
  if (currentStock <= 0) return 'RUPTURE'
  if (currentStock <= minStock) return 'BAS'
  return 'OK'
}

export const stockStatusConfig: Record<
  StockStatus,
  { label: string; color: string; bg: string; border: string; badgeVariant: 'default' | 'destructive' | 'secondary' | 'outline' }
> = {
  OK:      { label: 'OK',      color: 'text-green-700 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-950',  border: 'border-green-200 dark:border-green-800', badgeVariant: 'default' },
  BAS:     { label: 'Bas',     color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950', border: 'border-orange-200 dark:border-orange-800', badgeVariant: 'secondary' },
  RUPTURE: { label: 'Rupture', color: 'text-red-700 dark:text-red-400',      bg: 'bg-red-50 dark:bg-red-950',      border: 'border-red-200 dark:border-red-800',    badgeVariant: 'destructive' },
}

// ── Calcul CUMP ────────────────────────────────────────────────────────────

export function calculateCUMP(
  currentStock: number,
  currentCump: number,
  incomingQty: number,
  incomingUnitCost: number
): number {
  const totalQty = currentStock + incomingQty
  if (totalQty === 0) return incomingUnitCost
  const totalValue = currentStock * currentCump + incomingQty * incomingUnitCost
  return Math.round((totalValue / totalQty) * 10000) / 10000 // 4 décimales max
}

// ── Valorisation ───────────────────────────────────────────────────────────

export function calculateStockValue(stock: number, cump: number): number {
  return Math.round(stock * cump * 100) / 100
}

// ── Formatage MAD ──────────────────────────────────────────────────────────

export function formatMAD(value: number): string {
  return `${value.toLocaleString('fr-MA', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} MAD`
}

// ── Labels catégories ──────────────────────────────────────────────────────

export const categoryLabels: Record<string, string> = {
  COLORANT:  'Colorants',
  SOIN:      'Soins',
  COIFFANT:  'Coiffants',
  SHAMPOING: 'Shampoings',
  OUTIL:     'Outils',
  REVENTE:   'Revente',
  AUTRE:     'Autre',
}

export const categoryOrder = [
  'COLORANT', 'SOIN', 'COIFFANT', 'SHAMPOING', 'OUTIL', 'REVENTE', 'AUTRE'
]
