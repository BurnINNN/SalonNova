import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface DailyTransactionsMiniProps {
  transactions: any[]
}

export function DailyTransactionsMini({ transactions }: DailyTransactionsMiniProps) {
  return (
    <div className="glass-card rounded-3xl p-6 flex flex-col h-full min-h-[400px]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold tracking-tight">Derniers Encaissements</h3>
        <Link href="/caisse" className="text-sm font-medium text-primary hover:underline">
          Aller en caisse
        </Link>
      </div>

      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground opacity-70 gap-2">
          <ShoppingCart className="w-8 h-8" />
          <p className="text-sm text-center">Aucune transaction aujourd'hui.</p>
        </div>
      ) : (
        <div className="flex-1 space-y-3 overflow-y-auto pr-2">
          {transactions.slice(0, 5).map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-secondary/30 border border-border/50">
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-sm truncate">
                  {t.client ? `${t.client.firstName} ${t.client.lastName}` : 'Client passager'}
                </span>
                <span className="text-xs text-muted-foreground truncate mt-0.5">
                  {t.lines.map((l: any) => l.label).join(', ')}
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  {format(new Date(t.createdAt), 'HH:mm')}
                </span>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="font-bold">{t.totalAmount} DH</span>
                <Badge variant={t.paymentMethod === 'CASH' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                  {t.paymentMethod === 'CASH' ? 'Espèces' : 'Carte'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
