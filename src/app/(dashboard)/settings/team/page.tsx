import { getEmployees } from '@/actions/employees'
import { Plus, User, Mail, Phone, Percent } from 'lucide-react'
import { EmployeeDialog } from '@/components/settings/EmployeeDialog'

import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { getEmployeeStats } from '@/actions/employees'
import { startOfMonth, endOfMonth } from 'date-fns'
import { EmployeeStatsModal } from '@/components/team/EmployeeStatsModal'

export const dynamic = 'force-dynamic'

export default async function TeamSettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const employeeRecord = await prisma.employee.findUnique({
    where: { userId: user.id },
  })

  if (!employeeRecord) {
    return <div className="p-4 text-destructive">Aucun employé lié à votre compte.</div>
  }

  const salonId = employeeRecord.salonId
  const employees = await getEmployees(salonId)
  
  const start = startOfMonth(new Date())
  const end = endOfMonth(new Date())
  const stats = await getEmployeeStats(salonId, start, end)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Équipe</h2>
          <p className="text-sm text-muted-foreground">
            Gérez les membres de votre équipe, leurs accès et leurs commissions.
          </p>
        </div>

        <EmployeeDialog salonId={salonId} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees.map((employee) => (
          <div key={employee.id} className="glass-card p-6 flex flex-col relative overflow-hidden group">
            {/* Color indicator line */}
            <div 
              className="absolute top-0 left-0 w-full h-1" 
              style={{ backgroundColor: employee.color || '#3b82f6' }}
            />
            
            <div className="flex items-start justify-between mb-4 mt-2">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm"
                  style={{ backgroundColor: employee.color || '#3b82f6' }}
                >
                  <span className="font-semibold text-lg">
                    {employee.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{employee.name}</h3>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground inline-block mt-1">
                    {employee.role === 'MANAGER' ? 'Manager' : 'Coiffeur'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3 mt-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4 opacity-70" />
                <span className="truncate">{employee.email}</span>
              </div>
              {employee.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4 opacity-70" />
                  <span>{employee.phone}</span>
                </div>
              )}
              {employee.commissionRate !== null && employee.commissionRate !== undefined && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Percent className="w-4 h-4 opacity-70" />
                  <span>Commission: {employee.commissionRate}%</span>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2">
              <EmployeeStatsModal 
                employee={employee} 
                stats={stats[employee.id] || { ca: 0, appointmentsCount: 0 }} 
              />
              <EmployeeDialog 
                salonId={salonId} 
                employee={employee}
                trigger={
                  <button className="flex-1 px-3 py-2 rounded-xl text-sm font-medium bg-secondary text-foreground hover:bg-secondary/80 transition-colors">
                    Modifier
                  </button>
                }
              />
            </div>
          </div>
        ))}

        {employees.length === 0 && (
          <div className="col-span-full py-12 text-center border border-dashed border-border rounded-3xl">
            <User className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground">Aucun membre</h3>
            <p className="text-muted-foreground">Ajoutez des membres pour gérer l'agenda et la caisse.</p>
          </div>
        )}
      </div>
    </div>
  )
}
