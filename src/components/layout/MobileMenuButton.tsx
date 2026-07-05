'use client'

import { useState, ReactNode, useTransition } from 'react'
import { Menu, Loader2 } from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { switchSuperadminSalon } from '@/actions/superadmin'
import { useRouter } from 'next/navigation'

interface MobileMenuButtonProps {
  stockAlerts: number
  children: ReactNode
  isSuperAdmin?: boolean
  employeeName?: string
  salons?: { id: string; name: string }[]
  currentSalonId?: string
}

export function MobileMenuButton({ 
  stockAlerts, 
  children,
  isSuperAdmin = false,
  employeeName = 'Gérant',
  salons = [],
  currentSalonId = ''
}: MobileMenuButtonProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleSalonChange = (nextSalonId: string) => {
    startTransition(async () => {
      const res = await switchSuperadminSalon(nextSalonId)
      if (res.success) {
        router.refresh()
      } else {
        alert(res.error || 'Erreur lors du changement de salon')
      }
    })
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-primary/20">
      
      {/* Sidebar - Glassmorphism */}
      <Sidebar 
        stockAlerts={stockAlerts} 
        isMobileOpen={isMobileOpen} 
        onMobileClose={() => setIsMobileOpen(false)} 
        isSuperAdmin={isSuperAdmin}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        
        {/* Topbar */}
        <header className="h-14 md:h-20 px-4 md:px-8 flex items-center justify-between z-20 bg-background/60 backdrop-blur-xl border-b border-border/50 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-3">
            {/* Hamburger button - mobile only */}
            <button
              onClick={() => setIsMobileOpen(true)}
              className="md:hidden p-2 -ml-1 rounded-xl text-foreground hover:bg-secondary transition-colors touch-target"
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <p className="text-muted-foreground text-xs md:text-sm mt-0.5">Voici ce qui se passe dans votre salon aujourd'hui.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            {/* Superadmin Salon Selector */}
            {isSuperAdmin && salons.length > 0 && (
              <div className="flex items-center gap-1.5 glass px-3 py-1.5 rounded-full border border-stone-200/50 dark:border-stone-800 shadow-sm relative transition-all duration-300 hover:shadow-md">
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary absolute left-3" />}
                <select
                  value={currentSalonId}
                  disabled={isPending}
                  onChange={(e) => handleSalonChange(e.target.value)}
                  className={`bg-transparent border-0 text-xs md:text-sm font-semibold focus:ring-0 outline-none text-foreground cursor-pointer pr-8 ${isPending ? 'pl-5' : ''} max-w-[130px] md:max-w-[200px] truncate`}
                >
                  {salons.map((salon) => (
                    <option key={salon.id} value={salon.id} className="bg-background text-foreground text-sm">
                      {salon.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="hidden sm:flex items-center gap-3 glass-card px-4 py-2 rounded-full border border-stone-200/50 shadow-sm">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-sm font-medium text-foreground">Assistant IA Actif</span>
            </div>
            {/* Mobile: green dot only */}
            <div className="sm:hidden relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </div>
            <ThemeToggle />
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-xs md:text-sm text-primary shadow-sm hover:bg-primary/20 transition-colors cursor-pointer">
              {employeeName.charAt(0)}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 md:p-8 pt-0 z-10 scroll-smooth">
          {children}
        </div>
      </main>
    </div>
  )
}

