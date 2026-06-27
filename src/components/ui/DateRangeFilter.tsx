'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function DateRangeFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const currentRange = searchParams.get('range') || '30d'

  const handleValueChange = (value: string | null) => {
    if (!value) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('range', value)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <Select value={currentRange} onValueChange={handleValueChange}>
      <SelectTrigger className="w-[180px] h-9">
        <SelectValue placeholder="Période" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="today">Aujourd'hui</SelectItem>
        <SelectItem value="7d">7 derniers jours</SelectItem>
        <SelectItem value="30d">1 mois</SelectItem>
        <SelectItem value="90d">3 mois</SelectItem>
        <SelectItem value="180d">6 mois</SelectItem>
      </SelectContent>
    </Select>
  )
}
