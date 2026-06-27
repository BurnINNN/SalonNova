'use client'

import { Scissors, Lock, Mail, Loader2 } from 'lucide-react'
import { useFormState, useFormStatus } from 'react-dom'
import { login } from './actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  
  return (
    <button 
      type="submit" 
      disabled={pending}
      className="w-full py-4 px-4 bg-primary text-primary-foreground font-semibold rounded-2xl shadow-lg shadow-primary/25 hover:bg-primary/90 hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
    >
      {pending && <Loader2 className="w-5 h-5 animate-spin" />}
      {pending ? 'Connexion...' : 'Connexion'}
    </button>
  )
}

export default function LoginPage() {
  const [state, formAction] = useFormState(login, null)

  return (
    <div className="flex h-screen items-center justify-center bg-background relative overflow-hidden selection:bg-primary/20">
      
      {/* Decorative background blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[50vw] h-[50vw] rounded-full bg-orange-500/5 blur-[120px]" />
      </div>

      <div className="glass-card rounded-[2.5rem] p-10 max-w-md w-full mx-4 relative z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-xl shadow-primary/20 mb-6">
            <Scissors className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground text-center">Salon Pro</h1>
          <p className="text-center text-sm text-muted-foreground mt-2">
            L'excellence à portée de clic
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          {state?.error && (
            <div className="p-3 text-sm bg-destructive/10 text-destructive border border-destructive/20 rounded-xl text-center">
              {state.error}
            </div>
          )}

          <div className="space-y-1.5 relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-muted-foreground">
              <Mail className="w-5 h-5" />
            </div>
            <input 
              type="email" 
              name="email"
              required
              placeholder="Email professionnel" 
              className="w-full bg-secondary/50 border border-border rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground/70"
            />
          </div>

          <div className="space-y-1.5 relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-muted-foreground">
              <Lock className="w-5 h-5" />
            </div>
            <input 
              type="password" 
              name="password"
              required
              placeholder="Mot de passe" 
              className="w-full bg-secondary/50 border border-border rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground/70"
            />
          </div>

          <div className="flex items-center justify-between mt-2 mb-6 px-1">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input type="checkbox" className="rounded-md border-border text-primary focus:ring-primary" />
              Se souvenir de moi
            </label>
            <a href="#" className="text-sm font-medium text-primary hover:underline">Mot de passe oublié ?</a>
          </div>

          <SubmitButton />
        </form>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>En vous connectant, vous acceptez nos <br/><a href="#" className="underline hover:text-primary transition-colors">Conditions générales</a> et notre <a href="#" className="underline hover:text-primary transition-colors">Politique de confidentialité</a>.</p>
        </div>
      </div>
    </div>
  )
}
