import { Badge } from '@/components/ui/badge'
import { getStockStatus, stockStatusConfig } from '@/lib/stock/utils'

interface StockStatusBadgeProps {
  currentStock: number
  minStock:     number
  unit?:        string
  showQty?:     boolean
}

export function StockStatusBadge({
  currentStock,
  minStock,
  unit,
  showQty = false,
}: StockStatusBadgeProps) {
  const status = getStockStatus(currentStock, minStock)
  const cfg    = stockStatusConfig[status]

  return (
    <div className="flex items-center gap-2">
      <Badge variant={cfg.badgeVariant} className="text-xs font-semibold">
        {cfg.label}
      </Badge>
      {showQty && (
        <span className={`text-sm font-medium ${cfg.color}`}>
          {currentStock} {unit}
        </span>
      )}
    </div>
  )
}
