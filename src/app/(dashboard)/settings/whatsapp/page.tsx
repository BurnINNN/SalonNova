import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'

export default async function WhatsappSettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const employee = await prisma.employee.findUnique({ where: { userId: user.id } })
  if (!employee) return null

  const salon = await prisma.salon.findUnique({ where: { id: employee.salonId } })
  if (!salon) return null

  // MOCK: In real app, settings would be parsed from salon.settings
  const settings = salon.settings as any || {}
  const isEnabled = settings.whatsappRemindersEnabled || false

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Rappels WhatsApp</h2>
        <p className="text-muted-foreground">
          Gérez l'envoi automatique de SMS / WhatsApp pour réduire vos no-shows.
        </p>
      </div>

      <div className="glass-card p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Activer les rappels J-1</h3>
            <p className="text-sm text-muted-foreground">
              Un message sera envoyé la veille du rendez-vous à 18h00.
            </p>
          </div>
          {/* Dans une vraie app, on utiliserait un Switch component et une Server Action pour mettre à jour */}
          <div className={`px-4 py-2 rounded-full text-sm font-medium ${isEnabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
            {isEnabled ? 'Activé' : 'Désactivé'}
          </div>
        </div>

        <div className="border-t border-border/50 pt-6">
          <h3 className="font-semibold mb-2">Modèle de message</h3>
          <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground font-mono">
            Bonjour {'{Client}'}, rappel pour votre RDV demain à {'{Heure}'} pour {'{Prestation}'} avec {'{Coiffeur}'}. Répondez 1 pour confirmer ou 2 pour annuler.
          </div>
        </div>

        <div className="pt-4">
          <Button>Sauvegarder les préférences</Button>
        </div>
      </div>
    </div>
  )
}
