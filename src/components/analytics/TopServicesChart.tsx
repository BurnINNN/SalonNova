'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface TopServicesChartProps {
  title: string
  data: { name: string; revenue: number; volume: number }[]
}

export function TopServicesChart({ title, data }: TopServicesChartProps) {
  const chartData = data.map(item => ({
    name: item.name,
    "Chiffre d'Affaires": item.revenue,
    "Volume": item.volume,
  }))

  return (
    <div className="p-4 rounded-xl glass-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
      <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100">{title}</h2>
      {chartData.length === 0 ? (
        <p className="text-slate-500 text-sm h-64 flex items-center justify-center">Aucune donnée disponible.</p>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <XAxis type="number" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `${value} MAD`} />
              <YAxis dataKey="name" type="category" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} width={100} />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  color: '#1e293b'
                }}
                formatter={(value: any, name: any) => [
                  name === "Chiffre d'Affaires" ? `${value.toFixed(0)} MAD` : `${value} actes`,
                  name
                ]}
              />
              <Bar dataKey="Chiffre d'Affaires" fill="#c4a482" radius={[0, 4, 4, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
