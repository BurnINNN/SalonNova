import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { SuperadminClient } from './SuperadminClient'

export const dynamic = 'force-dynamic'

export default async function SuperadminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Guard: Only allow the superadmin email
  if (!user || user.email !== 'mehdielebbar7@gmail.com') {
    redirect('/dashboard')
  }

  // Load all salons
  const salons = await prisma.salon.findMany({
    orderBy: { createdAt: 'desc' },
  })

  // Load all employees with their salon details
  const employees = await prisma.employee.findMany({
    include: {
      salon: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Console Super Admin</h1>
        <p className="text-muted-foreground text-sm">
          Gérez l'ensemble des salons, créez des comptes utilisateurs et affectez les rôles et permissions.
        </p>
      </div>

      <SuperadminClient initialEmployees={employees} salons={salons} />
    </div>
  )
}
