'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  MessageSquareText,
  Package,
  ShoppingCart,
  Truck,
  Settings,
  LogOut,
  Scissors,
  ClipboardList,
  LineChart,
  UsersRound,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const navigation = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/caisse', label: 'Caisse', icon: ShoppingCart },
  { href: '/agenda', label: 'Agenda Intelligent', icon: CalendarDays },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/inbox', label: 'Messages AI', icon: MessageSquareText, badge: true },
  { href: '/stock', label: 'Stock', icon: Package },
  { href: '/finances', label: 'Rapports & Finances', icon: LineChart },
]

export function Sidebar({ stockAlerts = 0 }: { stockAlerts?: number }) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  function isActive(href: string): boolean {
    if (href === '/dashboard') return pathname === '/dashboard'
    // For /stock sub-routes
    if (href === '/stock/inventory') return pathname.startsWith('/stock/inventory')
    if (href === '/stock') return pathname === '/stock' || pathname.startsWith('/stock/products')
    return pathname.startsWith(href)
  }

  return (
    <aside className={`${isCollapsed ? 'w-24' : 'w-72'} flex-shrink-0 m-4 rounded-3xl glass flex flex-col shadow-sm relative z-20`}>
      {/* Logo Area */}
      <div className={`h-24 flex items-center justify-between ${isCollapsed ? 'px-4' : 'px-6'} border-b border-border/50`}>
        <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
          <div className="w-10 h-10 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-primary-foreground shadow-md shadow-primary/20">
            <Scissors className="w-5 h-5" />
          </div>
          {!isCollapsed && <h2 className="text-xl font-semibold tracking-tight text-foreground transition-opacity duration-300">Salon Pro</h2>}
        </div>
      </div>
      
      {/* Toggle Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-8 right-4 bg-background border border-border text-foreground rounded-full p-1.5 shadow-sm hover:bg-secondary transition-colors z-30"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Navigation */}
      <nav className={`flex-1 ${isCollapsed ? 'p-3' : 'p-6'} space-y-2 overflow-y-auto`}>
        {!isCollapsed && (
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 ml-2">
            Menu Principal
          </div>
        )}

        {navigation.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center ${isCollapsed ? 'justify-center p-3' : 'gap-3 p-3'} rounded-2xl transition-all duration-300 relative ${
                active
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span className="font-medium whitespace-nowrap overflow-hidden">{item.label}</span>}
              {item.badge && (
                <span className={`absolute ${isCollapsed ? 'right-2 top-2' : 'right-3 top-1/2 -translate-y-1/2'} w-2 h-2 rounded-full bg-destructive`} />
              )}
              {item.href === '/stock' && stockAlerts > 0 && (
                <span className={`absolute ${isCollapsed ? 'right-2 top-2' : 'right-3 top-1/2 -translate-y-1/2'} w-2 h-2 rounded-full bg-destructive animate-pulse`} />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom Actions */}
      <div className={`${isCollapsed ? 'p-3' : 'p-6'} border-t border-border/50 space-y-2`}>
        <Link
          href="/settings/general"
          className={`w-full flex items-center ${isCollapsed ? 'justify-center p-3' : 'gap-3 p-3'} rounded-2xl transition-all duration-300 ${
            pathname.startsWith('/settings')
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
          title={isCollapsed ? 'Paramètres' : undefined}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium whitespace-nowrap overflow-hidden">Paramètres</span>}
        </Link>
        <button 
          className={`w-full flex items-center ${isCollapsed ? 'justify-center p-3' : 'gap-3 p-3'} rounded-2xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-300`}
          title={isCollapsed ? 'Déconnexion' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium whitespace-nowrap overflow-hidden">Déconnexion</span>}
        </button>
      </div>
    </aside>
  )
}
