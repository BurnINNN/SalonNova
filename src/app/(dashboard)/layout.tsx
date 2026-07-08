import { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getLowAndRuptureProductsCount } from '@/actions/stock'
import { MobileMenuButton } from '@/components/layout/MobileMenuButton'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  let stockAlerts = 0
  let isSuperAdmin = false
  let employeeName = "Gérant"
  let salons: { id: string; name: string }[] = []
  let currentSalonId = ""

  if (user) {
    isSuperAdmin = user.email === 'mehdielebbar7@gmail.com'
    
    // Auto-create/link superadmin employee if missing or not linked
    let employee = await prisma.employee.findUnique({ where: { userId: user.id } })
    if (employee && isSuperAdmin && employee.email !== 'mehdielebbar7@gmail.com') {
      employee = await prisma.employee.update({
        where: { id: employee.id },
        data: { email: 'mehdielebbar7@gmail.com' }
      })
    }
    if (!employee && isSuperAdmin) {
      employee = await prisma.employee.findFirst({ where: { email: 'mehdielebbar7@gmail.com' } })
      if (employee) {
        employee = await prisma.employee.update({
          where: { id: employee.id },
          data: { userId: user.id }
        })
      } else {
        let salon = await prisma.salon.findFirst()
        if (!salon) {
          salon = await prisma.salon.create({
            data: { name: 'SalonNova', slug: 'salon-nova', settings: {} }
          })
        }
        employee = await prisma.employee.create({
          data: {
            name: 'Super Admin',
            email: 'mehdielebbar7@gmail.com',
            role: 'MANAGER',
            userId: user.id,
            salonId: salon.id
          }
        })
      }
    }

    if (employee) {
      stockAlerts = await getLowAndRuptureProductsCount(employee.salonId)
      employeeName = employee.name
      currentSalonId = employee.salonId
    }

    if (isSuperAdmin) {
      salons = await prisma.salon.findMany({ select: { id: true, name: true } })
    }
  }

  return (
    <MobileMenuButton 
      stockAlerts={stockAlerts}
      isSuperAdmin={isSuperAdmin}
      employeeName={employeeName}
      salons={salons}
      currentSalonId={currentSalonId}
    >
      {children}
    </MobileMenuButton>
  )
}

