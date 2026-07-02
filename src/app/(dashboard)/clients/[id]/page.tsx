import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { getClientWithHistory, getClientStats } from '@/actions/clients'
import { AppointmentHistory } from '@/components/clients/AppointmentHistory'
import { HairProfileForm } from '@/components/clients/HairProfileForm'
import { Badge } from '@/components/ui/badge'
import { notFound } from 'next/navigation'
import Link from 'next/link'

import { EditClientDialog } from '@/components/clients/EditClientDialog'

export default async function ClientPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const employee = await prisma.employee.findUnique({ where: { userId: user.id } })
  if (!employee) return null

  const [client, stats] = await Promise.all([
    getClientWithHistory(params.id, employee.salonId),
    getClientStats(params.id, employee.salonId),
  ])

  if (!client) return notFound()

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/clients" className="hover:text-foreground transition-colors">Clients</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{client.firstName} {client.lastName}</span>
      </div>

      {/* En-tête client */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {client.firstName} {client.lastName}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{client.phone ?? 'Pas de téléphone'}</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <EditClientDialog client={{
            id: client.id,
            firstName: client.firstName,
            lastName: client.lastName,
            phone: client.phone,
            whatsappOptOut: client.whatsappOptOut,
            aiInstructions: client.aiInstructions,
          }} />
          <div className="flex gap-2">
            {client.whatsappId && <Badge variant="outline">WhatsApp</Badge>}
            {client.instagramId && <Badge variant="outline">Instagram</Badge>}
            {client.messengerId && <Badge variant="outline">Messenger</Badge>}
          </div>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.totalVisits}</div>
          <div className="text-xs text-muted-foreground mt-1">Visites totales</div>
        </div>
        <div className="glass-card rounded-2xl p-5 text-center">
          <div className="text-2xl font-bold text-primary">{stats.totalSpent} MAD</div>
          <div className="text-xs text-muted-foreground mt-1">CA généré</div>
        </div>
        <div className="glass-card rounded-2xl p-5 text-center">
          <div className="text-2xl font-bold text-orange-500">{stats.noShows}</div>
          <div className="text-xs text-muted-foreground mt-1">No-shows</div>
        </div>
      </div>

      {/* Consignes IA spécifiques */}
      {client.aiInstructions && (
        <div className="glass-card rounded-2xl p-5 border-l-4 border-amber-500 bg-amber-500/5 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-sm">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-xs">🤖</span>
            Consignes spécifiques pour l'IA
          </div>
          <p className="text-sm text-foreground mt-2 font-medium italic">
            "{client.aiInstructions}"
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Ces règles sont lues et suivies automatiquement par l'assistante IA Sofia lors de ses discussions avec ce client.
          </p>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-6">
        {/* Historique RDV */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Historique des rendez-vous</h2>
          <AppointmentHistory appointments={client.appointments} />
        </div>

        {/* Fiche Capillaire */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Fiche Capillaire</h2>
          <HairProfileForm
            clientId={client.id}
            initialData={client.hairProfile ? {
              hairType: client.hairProfile.hairType ?? undefined,
              hairCondition: client.hairProfile.hairCondition ?? undefined,
              colorFormula: client.hairProfile.colorFormula ?? undefined,
              sensitiveScalp: client.hairProfile.sensitiveScalp,
              allergies: client.hairProfile.allergies ?? undefined,
              preferredStyle: client.hairProfile.preferredStyle ?? undefined,
              notes: client.hairProfile.notes ?? undefined,
            } : undefined}
          />
        </div>
      </div>
    </div>
  )
}
