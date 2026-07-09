import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { ChatUI } from '@/components/inbox/ChatUI'

export default async function InboxPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let salonId = ''
  let conversations: any[] = []
  let counts = { bot: 0, human: 0, resolved: 0, total: 0 }

  if (user) {
    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
    })
    
    if (employee) {
      salonId = employee.salonId

      // Récupérer les conversations réelles
      conversations = await prisma.conversation.findMany({
        where: { salonId: employee.salonId },
        include: {
          client: true,
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
      })

      // Compteurs par statut
      const [bot, human, resolved, salon] = await Promise.all([
        prisma.conversation.count({ where: { salonId, status: 'BOT' } }),
        prisma.conversation.count({ where: { salonId, status: 'HUMAN' } }),
        prisma.conversation.count({ where: { salonId, status: 'RESOLVED' } }),
        prisma.salon.findUnique({ where: { id: salonId }, select: { settings: true } })
      ])
      counts = { bot, human, resolved, total: bot + human + resolved }
      const settings = (salon?.settings as any) || {}
      const initialAiEnabled = settings.aiEnabled !== false

      return (
        <div className="h-full flex flex-col pb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Boîte de réception</h1>
            <div className="flex gap-2">
              {counts.bot > 0 && (
                <span className="bg-green-500/10 text-green-600 px-3 py-1 rounded-full text-xs font-semibold">
                  🤖 {counts.bot} Bot
                </span>
              )}
              {counts.human > 0 && (
                <span className="bg-orange-500/10 text-orange-600 px-3 py-1 rounded-full text-xs font-semibold">
                  👤 {counts.human} Humain
                </span>
              )}
            </div>
          </div>
          <div className="flex-1 min-h-[600px]">
            <ChatUI 
              initialConversations={JSON.parse(JSON.stringify(conversations))} 
              salonId={salonId} 
              initialAiEnabled={initialAiEnabled}
            />
          </div>
        </div>
      )
    }
  }

  return (
    <div className="p-4 text-destructive">Aucun employé lié à votre compte.</div>
  )
}
