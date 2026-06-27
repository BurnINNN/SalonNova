import { ReactNode } from 'react'

interface MetricCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: 'green' | 'orange' | 'blue' | 'purple'
  icon?: ReactNode
}

export function MetricCard({ label, value, sub, accent = 'blue', icon }: MetricCardProps) {
  const accents = {
    green: {
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-300 dark:border-emerald-500/40'
    },
    orange: {
      bg: 'bg-orange-50 dark:bg-orange-500/10',
      text: 'text-orange-600 dark:text-orange-400',
      border: 'border-orange-300 dark:border-orange-500/40'
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-300 dark:border-blue-500/40'
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-500/10',
      text: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-300 dark:border-purple-500/40'
    },
  }

  const selected = accents[accent]

  return (
    <div className={`glass-card rounded-3xl p-6 flex flex-col gap-4 relative overflow-hidden group border-2 ${selected.border}`}>
      {/* Decorative gradient blob */}
      <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full blur-3xl opacity-50 transition-opacity duration-500 group-hover:opacity-80 ${selected.bg}`} />
      
      <div className="flex justify-between items-start z-10">
        <span className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">{label}</span>
        {icon && (
          <div className={`p-2.5 rounded-xl ${selected.bg} ${selected.text} ${selected.border} border`}>
            {icon}
          </div>
        )}
      </div>
      
      <div className="z-10 mt-2">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold tracking-tight text-foreground">{value}</span>
        </div>
        {sub && (
          <span className="text-sm font-medium text-muted-foreground mt-2 block">
            {sub}
          </span>
        )}
      </div>
    </div>
  )
}
