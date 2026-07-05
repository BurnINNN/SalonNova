import { ReactNode } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getLowAndRuptureProductsCount } from '@/actions/stock'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { MobileMenuButton } from '@/components/layout/MobileMenuButton'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  let stockAlerts = 0
  if (user) {
    const employee = await prisma.employee.findUnique({ where: { userId: user.id } })
    if (employee) {
      stockAlerts = await getLowAndRuptureProductsCount(employee.salonId)
    }
  }

  return (
    <MobileMenuButton stockAlerts={stockAlerts}>
      {children}
    </MobileMenuButton>
  )
}
