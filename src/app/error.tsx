'use client'

import { useEffect } from 'react'
import { AlertCircle, RotateCw } from 'lucide-react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Unhandled app error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 selection:bg-primary/20">
      {/* Subtle background decoration */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/3 pointer-events-none" />

      <div className="glass-card max-w-md w-full p-8 rounded-3xl border-2 border-destructive/20 shadow-xl flex flex-col items-center text-center gap-6 relative z-10">
        <div className="w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Une erreur est survenue</h2>
          <p className="text-sm text-muted-foreground">
            L'application a rencontré un problème inattendu lors du rendu de cette page.
          </p>
          {error.message && (
            <div className="mt-4 p-3 bg-secondary/50 rounded-xl border border-border/55 text-left">
              <code className="text-xs text-muted-foreground break-all">{error.message}</code>
            </div>
          )}
        </div>

        <div className="flex gap-3 w-full">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 h-11 rounded-xl border border-border bg-background hover:bg-secondary text-sm font-semibold transition-all duration-200"
          >
            Recharger
          </button>
          <button
            onClick={() => reset()}
            className="flex-1 h-11 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-sm font-semibold shadow-md shadow-primary/20 flex items-center justify-center gap-2 transition-all duration-200"
          >
            <RotateCw className="w-4 h-4" />
            Réessayer
          </button>
        </div>
      </div>
    </div>
  )
}
