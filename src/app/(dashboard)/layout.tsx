import { ReactNode } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getLowAndRuptureProducts } from '@/actions/stock'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  let stockAlerts = 0
  if (user) {
    const employee = await prisma.employee.findUnique({ where: { userId: user.id } })
    if (employee) {
      const alerts = await getLowAndRuptureProducts(employee.salonId)
      stockAlerts = alerts.rupture.length + alerts.bas.length
    }
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-primary/20">
      
      {/* Sidebar - Glassmorphism */}
      <Sidebar stockAlerts={stockAlerts} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        
        {/* Topbar */}
        <header className="h-20 px-8 flex items-center justify-between z-20 bg-background/60 backdrop-blur-xl border-b border-border/50 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Bonjour, Gérant 👋</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Voici ce qui se passe dans votre salon aujourd'hui.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 glass-card px-4 py-2 rounded-full border border-stone-200/50 shadow-sm">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-sm font-medium text-foreground">Assistant IA Actif</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-sm text-primary shadow-sm hover:bg-primary/20 transition-colors cursor-pointer">
              G
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-8 pt-0 z-10 scroll-smooth">
          {children}
        </div>
      </main>
    </div>
  )
}
