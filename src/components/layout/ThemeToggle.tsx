'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="w-10 h-10 rounded-full border border-border bg-background/50 animate-pulse" />
    )
  }

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="w-10 h-10 rounded-full border border-border bg-background/50 hover:bg-secondary flex items-center justify-center text-foreground transition-all duration-300 shadow-sm focus:outline-none hover:scale-105 active:scale-95"
      aria-label="Toggle Theme"
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-amber-500 transition-transform duration-500 rotate-0" />
      ) : (
        <Moon className="w-5 h-5 text-slate-700 transition-transform duration-500 rotate-0" />
      )}
    </button>
  )
}
