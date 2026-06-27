'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings, Users, Scissors, MessageCircle } from 'lucide-react'

const settingsNavigation = [
  { href: '/settings/general', label: 'Général', icon: Settings },
  { href: '/settings/team', label: 'Équipe', icon: Users },
  { href: '/settings/services', label: 'Prestations', icon: Scissors },
  { href: '/settings/integrations', label: 'Intégrations', icon: MessageCircle },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex-1 overflow-auto p-8 relative z-20">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Paramètres</h1>
          <p className="text-muted-foreground mt-1">
            Gérez la configuration, votre équipe et votre catalogue de prestations.
          </p>
        </div>

        {/* Secondary Navigation */}
        <div className="flex items-center space-x-2 border-b border-border/50 pb-4 overflow-x-auto">
          {settingsNavigation.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 font-medium whitespace-nowrap ${
                  active
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </div>

        {/* Content */}
        <div className="pt-4">
          {children}
        </div>
      </div>
    </div>
  )
}
