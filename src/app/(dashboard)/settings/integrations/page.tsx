import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageCircle } from 'lucide-react'

export default function IntegrationsPage() {
  const metaAppId = process.env.META_APP_ID || '';
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/facebook`;
  const scopes = 'pages_show_list,pages_messaging,instagram_basic,instagram_manage_messages,pages_read_engagement,whatsapp_business_management,whatsapp_business_messaging';
  
  // Dummy salonId for the current user/salon context. In a real app, get this from your auth context (e.g. Supabase session)
  const salonId = 'current_salon_id_placeholder';

  const oauthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${metaAppId}&redirect_uri=${redirectUri}&scope=${scopes}&response_type=code&state=${salonId}`;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-foreground">Intégrations</h3>
        <p className="text-sm text-muted-foreground">
          Connectez votre salon aux plateformes externes pour automatiser votre messagerie omnicanale.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-card border-border/50 shadow-sm bg-card/40 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-600" />
              Meta (Facebook, Instagram, WhatsApp)
            </CardTitle>
            <CardDescription>
              Connectez votre page Facebook, votre compte Instagram Pro et votre WhatsApp Business pour activer l'IA sur ces canaux.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4">
              <p className="text-sm text-muted-foreground">
                L'intégration Meta vous permettra de recevoir et de répondre aux messages de vos clients directement depuis le dashboard ou via notre IA.
              </p>
              <a href={oauthUrl} className={cn(buttonVariants({ variant: 'default' }), "w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white")}>
                <MessageCircle className="w-4 h-4 mr-2" />
                Connecter Meta
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
