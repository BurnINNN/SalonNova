'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import {
  Send,
  Bot,
  User as UserIcon,
  MessageSquareText,
  CheckCircle2,
  RotateCcw,
  HandMetal,
  Filter,
  Smartphone,
  MessageCircle,
  MessagesSquare,
  Info,
  Loader2,
  ArrowLeft,
} from 'lucide-react'
import {
  getConversations,
  getMessages,
  sendHumanMessage,
  takeOverConversation,
  resolveConversation,
  reactivateBotConversation,
} from '@/actions/inbox'
import { confirmAppointment, rejectAppointment } from '@/actions/appointments'
import { toast } from 'sonner'

// ============================================================
// TYPES
// ============================================================

interface Message {
  id: string
  content: string
  role: 'USER' | 'ASSISTANT' | 'SYSTEM'
  createdAt: string | Date
}

interface Client {
  id: string
  firstName: string
  lastName: string
  appointments?: {
    id: string
    startTime: string | Date
    endTime: string | Date
    status: string
    service: {
      name: string
      price: number
      duration: number
      bufferMinutes: number
    }
    employee: {
      name: string
    }
  }[]
}

interface Conversation {
  id: string
  channel: 'WHATSAPP' | 'INSTAGRAM' | 'MESSENGER'
  status: 'BOT' | 'HUMAN' | 'RESOLVED'
  externalId: string
  updatedAt: string | Date
  client: Client | null
  messages: Message[]
}

interface ChatUIProps {
  initialConversations: Conversation[]
  salonId: string
}

// ============================================================
// HELPERS
// ============================================================

const channelConfig = {
  WHATSAPP: { icon: Smartphone, color: 'text-green-500', bg: 'bg-green-500/10', label: 'WhatsApp' },
  INSTAGRAM: { icon: MessageCircle, color: 'text-pink-500', bg: 'bg-pink-500/10', label: 'Instagram' },
  MESSENGER: { icon: MessagesSquare, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Messenger' },
}

const statusConfig = {
  BOT: { icon: Bot, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Bot IA' },
  HUMAN: { icon: UserIcon, color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'Humain' },
  RESOLVED: { icon: CheckCircle2, color: 'text-primary', bg: 'bg-primary/10', label: 'Résolue' },
}

function getClientName(conv: Conversation): string {
  if (conv.client) {
    return `${conv.client.firstName} ${conv.client.lastName}`.trim() || 'Client'
  }
  // Afficher un ID tronqué pour les clients non identifiés
  return `Client #${conv.externalId.slice(-6)}`
}

function formatTime(dateStr: string | Date): string {
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return "Aujourd'hui"
  if (date.toDateString() === yesterday.toDateString()) return 'Hier'
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export function ChatUI({ initialConversations, salonId }: ChatUIProps) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations)
  const [activeConvId, setActiveConvId] = useState<string | null>(initialConversations[0]?.id || null)
  const [messageInput, setMessageInput] = useState('')
  const [channelFilter, setChannelFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [isPending, startTransition] = useTransition()
  const [isSending, setIsSending] = useState(false)
  const [mobileShowChat, setMobileShowChat] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const activeConvIdRef = useRef(activeConvId)
  activeConvIdRef.current = activeConvId

  const conversationsRef = useRef(conversations)
  conversationsRef.current = conversations

  const activeConv = conversations.find((c) => c.id === activeConvId)

  // Auto-scroll quand les messages changent
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConv?.messages?.length])

  // Polling toutes les 5 secondes pour rafraîchir les conversations
  useEffect(() => {
    const interval = setInterval(() => {
      startTransition(async () => {
        try {
          const freshConversations = await getConversations()
          if (freshConversations && freshConversations.length > 0) {
            const currentActiveId = activeConvIdRef.current
            const currentConvs = conversationsRef.current

            // Comparaison intelligente pour éviter les re-renders et fetches inutiles
            let hasChanged = false
            if (freshConversations.length !== currentConvs.length) {
              hasChanged = true
            } else {
              for (let i = 0; i < freshConversations.length; i++) {
                const fresh = freshConversations[i]
                const current = currentConvs.find(c => c.id === fresh.id)
                if (!current) {
                  hasChanged = true
                  break
                }
                if (current.status !== fresh.status) {
                  hasChanged = true
                  break
                }
                const freshLastMsg = fresh.messages?.[0]
                const currentLastMsg = current.messages?.[current.messages.length - 1]
                if (freshLastMsg?.id !== currentLastMsg?.id) {
                  hasChanged = true
                  break
                }
              }
            }

            if (!hasChanged) {
              return // Aucun changement, on évite le fetch de messages et le setConversations
            }

            // Charger les messages uniquement pour la conversation active si elle a changé
            const convs = await Promise.all(
              freshConversations.map(async (conv: any) => {
                if (conv.id === currentActiveId) {
                  const msgs = await getMessages(conv.id)
                  return { ...conv, messages: JSON.parse(JSON.stringify(msgs)) }
                }
                const oldConv = currentConvs.find(c => c.id === conv.id)
                return { ...conv, messages: oldConv?.messages || conv.messages || [] }
              })
            )
            setConversations(convs as unknown as Conversation[])
          }
        } catch (err) {
          // Silencieux en cas d'erreur de polling
        }
      })
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  // Quand on change de conversation active, charger ses messages
  useEffect(() => {
    if (!activeConvId) return
    startTransition(async () => {
      try {
        const msgs = await getMessages(activeConvId)
        setConversations((prev) =>
          prev.map((c) => (c.id === activeConvId ? { ...c, messages: JSON.parse(JSON.stringify(msgs)) } : c)) as Conversation[]
        )
      } catch (err) {
        // silencieux
      }
    })
  }, [activeConvId])

  // Filtrer les conversations
  const filteredConversations = conversations.filter((conv) => {
    if (channelFilter !== 'ALL' && conv.channel !== channelFilter) return false
    if (statusFilter !== 'ALL' && conv.status !== statusFilter) return false
    return true
  })

  // ============================================================
  // HANDLERS
  // ============================================================

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!messageInput.trim() || !activeConvId || isSending) return

    const content = messageInput.trim()
    setMessageInput('')
    setIsSending(true)

    // Optimistic update
    const optimisticMsg: Message = {
      id: `temp_${Date.now()}`,
      content,
      role: 'ASSISTANT',
      createdAt: new Date().toISOString(),
    }
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConvId
          ? { ...c, messages: [...c.messages, optimisticMsg] }
          : c
      )
    )

    try {
      await sendHumanMessage(activeConvId, content)
      // Recharger les messages après envoi
      const msgs = await getMessages(activeConvId)
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConvId ? { ...c, messages: JSON.parse(JSON.stringify(msgs)) } : c)) as Conversation[]
      )
    } catch (err) {
      console.error('Erreur envoi message:', err)
    } finally {
      setIsSending(false)
    }
  }

  async function handleTakeOver() {
    if (!activeConvId) return
    try {
      await takeOverConversation(activeConvId)
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConvId ? { ...c, status: 'HUMAN' as const } : c))
      )
    } catch (err) {
      console.error('Erreur prise en main:', err)
    }
  }

  async function handleResolve() {
    if (!activeConvId) return
    try {
      await resolveConversation(activeConvId)
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConvId ? { ...c, status: 'RESOLVED' as const } : c))
      )
    } catch (err) {
      console.error('Erreur résolution:', err)
    }
  }

  async function handleReactivateBot() {
    if (!activeConvId) return
    try {
      await reactivateBotConversation(activeConvId)
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConvId ? { ...c, status: 'BOT' as const } : c))
      )
    } catch (err) {
      console.error('Erreur réactivation bot:', err)
    }
  }

  const [isActionPending, setIsActionPending] = useState(false)

  async function handleConfirmApt(appointmentId: string) {
    if (isActionPending) return
    setIsActionPending(true)
    try {
      await confirmAppointment(appointmentId, activeConvId || undefined)
      toast.success('Rendez-vous confirmé avec succès !')
      
      if (activeConvId) {
        const freshConvs = await getConversations()
        setConversations(freshConvs as unknown as Conversation[])
        const msgs = await getMessages(activeConvId)
        setConversations((prev) =>
          prev.map((c) => (c.id === activeConvId ? { ...c, messages: JSON.parse(JSON.stringify(msgs)) } : c)) as Conversation[]
        )
      }
    } catch (err) {
      console.error('Erreur confirmation RDV:', err)
      toast.error('Erreur lors de la confirmation du rendez-vous.')
    } finally {
      setIsActionPending(false)
    }
  }

  async function handleRejectApt(appointmentId: string) {
    if (isActionPending) return
    setIsActionPending(true)
    try {
      await rejectAppointment(appointmentId, activeConvId || undefined)
      toast.success('Rendez-vous refusé.')
      
      if (activeConvId) {
        const freshConvs = await getConversations()
        setConversations(freshConvs as unknown as Conversation[])
        const msgs = await getMessages(activeConvId)
        setConversations((prev) =>
          prev.map((c) => (c.id === activeConvId ? { ...c, messages: JSON.parse(JSON.stringify(msgs)) } : c)) as Conversation[]
        )
      }
    } catch (err) {
      console.error('Erreur rejet RDV:', err)
      toast.error('Erreur lors du rejet du rendez-vous.')
    } finally {
      setIsActionPending(false)
    }
  }

  // ============================================================
  // RENDU
  // ============================================================

  return (
    <div className="flex h-full rounded-3xl overflow-hidden glass-card shadow-sm">
      {/* ========== SIDEBAR — Liste des conversations ========== */}
      <div className={`w-full md:w-[360px] md:min-w-[320px] border-r border-border/50 flex flex-col bg-background/50 ${mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
        {/* Filtres */}
        <div className="p-3 md:p-4 border-b border-border/50 space-y-2 md:space-y-3">
          <div className="flex gap-1 md:gap-1.5 flex-wrap">
            {['ALL', 'BOT', 'HUMAN', 'RESOLVED'].map((status) => {
              const isActive = statusFilter === status
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-2.5 md:px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 touch-target ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  {status === 'ALL' ? 'Toutes' : status === 'BOT' ? '🤖 Bot' : status === 'HUMAN' ? '👤 Humain' : '✅ Résolues'}
                </button>
              )
            })}
          </div>
          <div className="flex gap-1 md:gap-1.5 flex-wrap">
            {['ALL', 'WHATSAPP', 'INSTAGRAM', 'MESSENGER'].map((channel) => {
              const isActive = channelFilter === channel
              const cfg = channel !== 'ALL' ? channelConfig[channel as keyof typeof channelConfig] : null
              return (
                <button
                  key={channel}
                  onClick={() => setChannelFilter(channel)}
                  className={`flex items-center gap-1 px-2 md:px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 touch-target ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  {cfg && <cfg.icon className="w-3 h-3" />}
                  {channel === 'ALL' ? 'Tous' : cfg?.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
              <Filter className="w-8 h-8 mb-2 text-border" />
              <p>Aucune conversation</p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = activeConvId === conv.id
              const lastMsg = conv.messages?.[conv.messages.length - 1]
              const channelCfg = channelConfig[conv.channel]
              const statusCfg = statusConfig[conv.status]
              const ChannelIcon = channelCfg.icon
              const StatusIcon = statusCfg.icon

              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    setActiveConvId(conv.id)
                    setMobileShowChat(true)
                  }}
                  className={`p-3 md:p-4 cursor-pointer rounded-2xl transition-all duration-300 touch-target ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                      : 'hover:bg-secondary text-foreground'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-sm">{getClientName(conv)}</span>
                    <span className={`text-xs ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {formatDate(conv.updatedAt)}
                    </span>
                  </div>
                  <div className={`text-xs truncate ${isActive ? 'text-primary-foreground/90' : 'text-muted-foreground'}`}>
                    {lastMsg?.role === 'SYSTEM'
                      ? '📋 ' + lastMsg.content.slice(1, 50)
                      : lastMsg?.content?.slice(0, 60) || 'Nouvelle conversation'}
                  </div>
                  <div className="mt-2 md:mt-2.5 flex gap-2 items-center">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                        isActive ? 'bg-primary-foreground/20' : channelCfg.bg
                      }`}
                    >
                      <ChannelIcon className={`w-3 h-3 ${isActive ? '' : channelCfg.color}`} />
                      {channelCfg.label}
                    </span>
                    <span
                      className={`text-[10px] font-bold flex items-center gap-1 ${
                        isActive ? 'text-primary-foreground/80' : statusCfg.color
                      }`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {statusCfg.label}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ========== ZONE DE MESSAGES ========== */}
      <div className={`flex-1 flex flex-col bg-background/30 relative ${mobileShowChat ? 'flex' : 'hidden md:flex'}`}>
        {activeConv ? (
          <>
            {/* En-tête */}
            <div className="h-14 md:h-20 px-3 md:px-6 border-b border-border/50 flex justify-between items-center bg-background/50 backdrop-blur-md z-10">
              <div className="flex items-center gap-2 md:gap-4 min-w-0">
                {/* Back button - mobile only */}
                <button
                  onClick={() => setMobileShowChat(false)}
                  className="md:hidden p-1.5 -ml-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors touch-target flex-shrink-0"
                  aria-label="Retour"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                  channelConfig[activeConv.channel].bg} ${channelConfig[activeConv.channel].color
                }`}>
                  {(() => { const Icon = channelConfig[activeConv.channel].icon; return <Icon className="w-4 h-4 md:w-5 md:h-5" /> })()}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm md:text-base truncate">{getClientName(activeConv)}</h3>
                  <div className="flex items-center gap-1.5 md:gap-2 text-xs text-muted-foreground">
                    <span className={`flex items-center gap-1 font-medium ${statusConfig[activeConv.status].color}`}>
                      {(() => { const Icon = statusConfig[activeConv.status].icon; return <Icon className="w-3 h-3" /> })()}
                      <span className="hidden sm:inline">{statusConfig[activeConv.status].label}</span>
                    </span>
                    <span className="hidden sm:inline">·</span>
                    <span className="hidden sm:inline">{channelConfig[activeConv.channel].label}</span>
                    <span className="hidden sm:inline">·</span>
                    <span className="hidden sm:inline">{activeConv.messages.length} messages</span>
                  </div>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                {activeConv.status === 'BOT' && (
                  <button
                    onClick={handleTakeOver}
                    className="flex items-center gap-1.5 bg-orange-500 text-white px-2.5 md:px-4 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-medium hover:bg-orange-600 transition-colors shadow-sm touch-target"
                  >
                    <HandMetal className="w-4 h-4" />
                    <span className="hidden sm:inline">Prendre la main</span>
                  </button>
                )}
                {activeConv.status === 'HUMAN' && (
                  <>
                    <button
                      onClick={handleReactivateBot}
                      className="flex items-center gap-1.5 bg-secondary text-secondary-foreground px-2.5 md:px-3 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-medium hover:bg-secondary/80 transition-colors touch-target"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span className="hidden sm:inline">Réactiver bot</span>
                    </button>
                    <button
                      onClick={handleResolve}
                      className="flex items-center gap-1.5 bg-primary text-primary-foreground px-2.5 md:px-4 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm touch-target"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Résoudre</span>
                    </button>
                  </>
                )}
                {activeConv.status === 'RESOLVED' && (
                  <button
                    onClick={handleReactivateBot}
                    className="flex items-center gap-1.5 bg-secondary text-secondary-foreground px-2.5 md:px-3 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-medium hover:bg-secondary/80 transition-colors touch-target"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span className="hidden sm:inline">Rouvrir</span>
                  </button>
                )}
              </div>
            </div>

            {/* Bannière de rendez-vous en attente */}
            {activeConv.client?.appointments && activeConv.client.appointments.length > 0 && (
              <div className="mx-3 md:mx-6 mt-3 md:mt-4 p-3 md:p-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 backdrop-blur-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex items-start gap-2 md:gap-3 min-w-0">
                  <div className="mt-1 w-7 h-7 md:w-8 md:h-8 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    ⏳
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-xs md:text-sm text-foreground">
                      Demande de rendez-vous en attente
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {activeConv.client!.appointments![0].service.name} avec <span className="font-medium">{activeConv.client!.appointments![0].employee.name}</span> · {activeConv.client!.appointments![0].service.price} MAD
                    </p>
                    <p className="text-xs text-amber-600 font-medium mt-1">
                      📅 {new Date(activeConv.client!.appointments![0].startTime).toLocaleDateString('fr-FR', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })} ({activeConv.client!.appointments![0].service.duration} min + {activeConv.client!.appointments![0].service.bufferMinutes || 0} min retard)
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto flex-shrink-0">
                  <button
                    onClick={() => handleConfirmApt(activeConv.client!.appointments![0].id)}
                    disabled={isActionPending}
                    className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white px-3 py-2 sm:py-1.5 rounded-xl text-xs font-semibold transition-colors shadow-sm disabled:opacity-50 touch-target"
                  >
                    Confirmer
                  </button>
                  <button
                    onClick={() => handleRejectApt(activeConv.client!.appointments![0].id)}
                    disabled={isActionPending}
                    className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white px-3 py-2 sm:py-1.5 rounded-xl text-xs font-semibold transition-colors shadow-sm disabled:opacity-50 touch-target"
                  >
                    Refuser
                  </button>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-3 md:space-y-4">
              {activeConv.messages.map((msg, idx) => {
                // Messages système
                if (msg.role === 'SYSTEM') {
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <div className="flex items-center gap-1.5 bg-secondary/50 text-muted-foreground text-xs px-3 md:px-4 py-1.5 rounded-full max-w-[90%] text-center">
                        <Info className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{msg.content.replace(/^\[|\]$/g, '')}</span>
                      </div>
                    </div>
                  )
                }

                const isUser = msg.role === 'USER'
                return (
                  <div key={msg.id} className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
                    <div className="flex flex-col gap-1 max-w-[85%] md:max-w-[70%]">
                      <div
                        className={`p-3 md:p-4 rounded-2xl text-sm leading-relaxed ${
                          isUser
                            ? 'bg-secondary text-secondary-foreground rounded-tl-sm'
                            : 'bg-primary text-primary-foreground rounded-tr-sm shadow-md shadow-primary/10'
                        }`}
                      >
                        {msg.content}
                      </div>
                      <span className={`text-[10px] text-muted-foreground ${isUser ? 'text-left ml-1' : 'text-right mr-1'}`}>
                        {formatTime(msg.createdAt)}
                        {!isUser && <span className="ml-1 opacity-60">· {activeConv.status === 'BOT' ? '🤖' : '👤'}</span>}
                      </span>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Zone de saisie */}
            {activeConv.status !== 'RESOLVED' && (
              <div className="p-3 md:p-4 bg-background/50 backdrop-blur-md border-t border-border/50">
                {activeConv.status === 'BOT' ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
                    <Bot className="w-4 h-4 text-green-500" />
                    <span className="text-xs md:text-sm">Le bot IA gère cette conversation.</span>
                    <button
                      onClick={handleTakeOver}
                      className="text-primary font-medium hover:underline text-xs md:text-sm"
                    >
                      Prendre la main
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage}>
                    <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-full p-1.5 pr-2 focus-within:ring-2 focus-within:ring-primary/50 transition-shadow">
                      <input
                        type="text"
                        placeholder="Écrivez un message..."
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        disabled={isSending}
                        className="flex-1 bg-transparent border-none px-3 md:px-4 text-sm outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!messageInput.trim() || isSending}
                        className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:scale-105 transition-transform shadow-sm disabled:opacity-50 disabled:hover:scale-100 touch-target"
                      >
                        {isSending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 ml-0.5" />
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-4">
            <MessageSquareText className="w-12 h-12 md:w-16 md:h-16 mb-4 text-border" />
            <p className="text-base md:text-lg font-medium mb-1">Aucune conversation sélectionnée</p>
            <p className="text-xs md:text-sm text-center">Choisissez une conversation dans la liste pour commencer</p>
          </div>
        )}
      </div>
    </div>
  )
}
