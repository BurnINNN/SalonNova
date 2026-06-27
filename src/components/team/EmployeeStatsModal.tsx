'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LineChart, Percent } from 'lucide-react'

export function EmployeeStatsModal({ employee, stats }: { employee: any, stats: { ca: number, appointmentsCount: number } }) {
  const [open, setOpen] = useState(false)
  const commission = employee.commissionRate ? (stats.ca * (employee.commissionRate / 100)) : 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="flex-1 px-3 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
        Performances
      </DialogTrigger>
      <DialogContent className="glass-card">
        <DialogHeader>
          <DialogTitle>Performances de {employee.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-secondary/50 border border-border/50">
              <p className="text-sm text-muted-foreground flex items-center gap-1"><LineChart className="w-4 h-4" /> CA Généré (Mois)</p>
              <p className="text-xl font-bold mt-1">{stats.ca.toFixed(0)} MAD</p>
            </div>
            <div className="p-4 rounded-xl bg-secondary/50 border border-border/50">
              <p className="text-sm text-muted-foreground flex items-center gap-1"><Percent className="w-4 h-4" /> Commission ({employee.commissionRate || 0}%)</p>
              <p className="text-xl font-bold mt-1 text-green-600">{commission.toFixed(0)} MAD</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-secondary/50 border border-border/50">
            <p className="text-sm text-muted-foreground">Prestations réalisées</p>
            <p className="text-xl font-bold mt-1">{stats.appointmentsCount}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
