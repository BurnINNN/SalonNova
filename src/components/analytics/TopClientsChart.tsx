'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface TopClientsChartProps {
  title: string
  data: { name: string; revenue: number; visits: number }[]
}

const COLORS = [
  '#c4a482', // Warm gold theme color
  '#8ea5b8', // Dusty blue
  '#a2a897', // Sage green
  '#bfa3a3', // Dusty rose
  '#9ca3af', // Slate grey
]

export function TopClientsChart({ title, data }: TopClientsChartProps) {
  const chartData = data.map(item => ({
    name: item.name,
    value: item.revenue,
    visits: item.visits
  }))

  return (
    <div className="p-4 rounded-xl glass-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
      <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100">{title}</h2>
      {chartData.length === 0 ? (
        <p className="text-slate-500 text-sm h-64 flex items-center justify-center">Aucune donnée disponible.</p>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="stroke-background hover:opacity-85 transition-opacity" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  color: '#1e293b'
                }}
                formatter={(value: any, name: any, props: any) => [
                  `${value.toFixed(0)} MAD (${props.payload.visits} visites)`,
                  name
                ]}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36} 
                iconType="circle"
                iconSize={8}
                formatter={(value) => <span className="text-xs text-muted-foreground font-medium">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
