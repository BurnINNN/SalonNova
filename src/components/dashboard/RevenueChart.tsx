'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import { useEffect, useState } from 'react'

interface RevenueChartProps {
  data: {
    day: string
    revenue: number
  }[]
}

export function RevenueChart({ data }: RevenueChartProps) {
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatches
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="h-6 w-32 bg-stone-200 dark:bg-stone-800 rounded animate-pulse" />
      </div>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass px-4 py-3 rounded-2xl border border-stone-200/60 dark:border-slate-700 shadow-xl text-sm font-semibold flex flex-col gap-0.5">
          <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">{payload[0].payload.day}</span>
          <span className="text-foreground text-base font-bold">{payload[0].value.toLocaleString('fr-FR')} MAD</span>
        </div>
      )
    }
    return null
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border) / 0.5)"
          vertical={false}
        />
        <XAxis
          dataKey="day"
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          dy={10}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          dx={-10}
          tickFormatter={(value) => `${value}`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="hsl(var(--primary))"
          strokeWidth={3}
          fillOpacity={1}
          fill="url(#colorRevenue)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
