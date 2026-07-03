import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageCircle, CheckCircle, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import WhatsAppIntegrationCard from './WhatsAppIntegrationCard'
import CalendarIntegrationCard from './CalendarIntegrationCard'
import { getWhatsAppConnectionState } from '@/actions/integrations'
import { randomUUID } from 'crypto'

interface PageProps {
  searchParams: {
    success?: string
    error?: string
  }
}

export default async function IntegrationsPage({ searchParams }: PageProps) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const employeeRecord = await prisma.employee.findUnique({
    where: { userId: user.id },
  })

  if (!employeeRecord) {
    return <div className="p-4 text-destructive">Aucun employé lié à votre compte.</div>
  }

  // S'assurer de la présence d'un jeton de calendrier pour cet employé
  let calendarToken = employeeRecord.calendarToken
  if (!calendarToken) {
    calendarToken = randomUUID()
    await prisma.employee.update({
      where: { id: employeeRecord.id },
      data: { calendarToken },
    })
  }

  const salonId = employeeRecord.salonId

  const metaAppId = process.env.META_APP_ID || ''
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/facebook`
  const scopes = 'pages_show_list,pages_messaging,instagram_basic,instagram_manage_messages,pages_read_engagement'
  
  // Meta OAuth URL pour Instagram et Messenger uniquement (sans les permissions WhatsApp)
  const oauthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${metaAppId}&redirect_uri=${redirectUri}&scope=${scopes}&response_type=code&state=${salonId}`

  // Récupérer les intégrations Meta actives (Instagram et Messenger)
  const integration = await prisma.integration.findFirst({
    where: { salonId, isActive: true },
  })

  // Récupérer le statut actuel d'Evolution API pour WhatsApp
  const whatsappState = await getWhatsAppConnectionState()

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-foreground">Intégrations</h3>
        <p className="text-sm text-muted-foreground">
          Connectez votre salon aux plateformes de messagerie externe pour activer notre assistante IA.
        </p>
      </div>

      {searchParams.success === 'true' && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400 p-4 rounded-2xl text-sm flex items-center gap-2 mb-6">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>Félicitations ! Vos comptes Meta ont été connectés avec succès. L'IA est maintenant active sur vos canaux Instagram et Messenger connectés.</span>
        </div>
      )}

      {searchParams.error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-2xl text-sm flex items-center gap-2 mb-6">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>
            {searchParams.error === 'oauth_failed' 
               ? "L'authentification auprès de Meta a échoué. Veuillez réessayer." 
               : "Paramètres manquants ou invalides lors de l'authentification."}
          </span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* 1. CARTE WHATSAPP GATEWAY (EVOLUTION API) */}
        <WhatsAppIntegrationCard 
          initialStatus={whatsappState.status as any}
          initialInstanceName={whatsappState.instanceName}
        />

        {/* 2. CARTE META (INSTAGRAM & MESSENGER) */}
        <Card className="glass-card border-border/50 shadow-sm bg-card/40 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <MessageCircle className="w-5 h-5 text-blue-600" />
              Meta (Instagram & Facebook Messenger)
            </CardTitle>
            <CardDescription>
              Connectez vos comptes Instagram Pro et vos pages Facebook Messenger pour activer l'IA sur ces réseaux sociaux.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4">
              <p className="text-sm text-muted-foreground">
                L'intégration officielle Meta vous permettra de recevoir et de répondre aux messages de vos clients sur Instagram et Messenger de façon stable et conforme.
              </p>
              
              <div className="flex items-center gap-3">
                <a href={oauthUrl} className={cn(buttonVariants({ variant: 'default' }), "w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-2xl")}>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  {integration ? 'Reconnecter Meta' : 'Connecter Meta'}
                </a>
                
                {integration && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-700 dark:text-green-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Actif
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. CARTE CALENDRIER (iCalendar Subscription) */}
        <CalendarIntegrationCard 
          employeeId={employeeRecord.id}
          initialToken={calendarToken}
        />
      </div>
    </div>
  )
}

