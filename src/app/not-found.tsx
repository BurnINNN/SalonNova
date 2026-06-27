import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground space-y-6">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <h2 className="text-2xl font-semibold">Page introuvable</h2>
      <p className="text-muted-foreground text-center max-w-md">
        Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
      </p>
      <Link href="/">
        <Button size="lg">
          Retour à l'accueil
        </Button>
      </Link>
    </div>
  )
}
