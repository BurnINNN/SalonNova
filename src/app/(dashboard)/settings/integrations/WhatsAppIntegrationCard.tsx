'use client'

import { useState, useEffect } from 'react'
import { generateWhatsAppQrCode, disconnectWhatsApp, getWhatsAppConnectionState } from '@/actions/integrations'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Smartphone, CheckCircle, AlertTriangle, Loader2, RefreshCw, Power } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

interface WhatsAppIntegrationCardProps {
  initialStatus: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'MOCK'
  initialInstanceName: string | null
}

export default function WhatsAppIntegrationCard({
  initialStatus,
  initialInstanceName,
}: WhatsAppIntegrationCardProps) {
  const [status, setStatus] = useState(initialStatus)
  const [instanceName, setInstanceName] = useState(initialInstanceName)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(false)

  // Polling du statut toutes les 5 secondes si on attend le scan
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null

    if (status === 'CONNECTING' || (status === 'DISCONNECTED' && qrCode)) {
      intervalId = setInterval(async () => {
        try {
          const res = await getWhatsAppConnectionState()
          if (res.status === 'CONNECTED') {
            setStatus('CONNECTED')
            setQrCode(null)
            toast.success('WhatsApp connecté avec succès ! 🎉')
            if (intervalId) clearInterval(intervalId)
          }
        } catch (error) {
          // Erreur silencieuse de polling
        }
      }, 5000)
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [status, qrCode])

  // Générer le QR Code
  async function handleConnect() {
    setIsLoading(true)
    setQrCode(null)
    try {
      const res = await generateWhatsAppQrCode()
      if (res.success && res.qrcode) {
        setQrCode(res.qrcode)
        setInstanceName(res.instanceName || null)
        setStatus('CONNECTING')
        toast.info('QR Code généré. Veuillez le scanner avec votre application WhatsApp.')
      } else {
        toast.error(res.error || 'Erreur lors de la génération du QR Code.')
        setStatus('DISCONNECTED')
      }
    } catch (error) {
      toast.error('Impossible de se connecter au serveur Railway.')
      setStatus('DISCONNECTED')
    } finally {
      setIsLoading(false)
    }
  }

  // Déconnecter et supprimer la session
  async function handleDisconnect() {
    if (!confirm('Êtes-vous sûr de vouloir déconnecter WhatsApp ? Tous les messages IA cesseront.')) return
    setIsLoading(true)
    try {
      const res = await disconnectWhatsApp()
      if (res.success) {
        setStatus('DISCONNECTED')
        setQrCode(null)
        setInstanceName(null)
        toast.success('WhatsApp déconnecté ✓')
      } else {
        toast.error(res.error || 'Erreur lors de la déconnexion.')
      }
    } catch (error) {
      toast.error('Erreur lors de la déconnexion.')
    } finally {
      setIsLoading(false)
    }
  }

  // Vérifier le statut manuellement
  async function handleCheckStatus() {
    setIsChecking(true)
    try {
      const res = await getWhatsAppConnectionState()
      setStatus(res.status as any)
      if (res.status === 'CONNECTED') {
        setQrCode(null)
        toast.success('WhatsApp est connecté !')
      } else if (res.status === 'DISCONNECTED') {
        toast.error('WhatsApp est déconnecté.')
      } else {
        toast.info('WhatsApp est en attente de scan du QR Code.')
      }
    } catch (error) {
      toast.error('Erreur de vérification.')
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <Card className="glass-card border-border/50 shadow-sm bg-card/40 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Smartphone className="w-5 h-5 text-green-500" />
          WhatsApp Gateway (Evolution API)
        </CardTitle>
        <CardDescription>
          Connectez votre compte WhatsApp personnel ou professionnel instantanément en scannant le QR code généré.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          
          {/* Section d'information et statuts */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/30 border border-border/40">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Statut : 
              {status === 'CONNECTED' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-700 dark:text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Connecté
                </span>
              )}
              {status === 'CONNECTING' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Attente du Scan
                </span>
              )}
              {status === 'DISCONNECTED' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-destructive/10 text-destructive">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  Déconnecté
                </span>
              )}
              {status === 'MOCK' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400">
                  Mode Simulation (Mock)
                </span>
              )}
            </div>
            {instanceName && (
              <span className="text-xs text-muted-foreground font-mono">
                Session : {instanceName}
              </span>
            )}
          </div>

          {/* Affichage du QR code ou de l'état connecté */}
          {status === 'CONNECTED' ? (
            <div className="bg-green-500/10 border border-green-500/20 text-green-800 dark:text-green-300 p-4 rounded-2xl text-sm flex gap-3">
              <CheckCircle className="w-5 h-5 flex-shrink-0 text-green-600 dark:text-green-400 mt-0.5" />
              <div>
                <p className="font-semibold">L'assistante IA est active sur votre WhatsApp !</p>
                <p className="text-xs mt-1 text-green-700 dark:text-green-400">
                  Elle répondra automatiquement à vos clients, et vous pourrez suivre et prendre la main sur les conversations à tout moment depuis la messagerie du tableau de bord.
                </p>
              </div>
            </div>
          ) : qrCode ? (
            <div className="flex flex-col items-center justify-center p-6 border border-border/40 rounded-3xl bg-white/50 dark:bg-black/20 backdrop-blur-sm shadow-inner space-y-4">
              <p className="text-xs text-center text-muted-foreground max-w-xs">
                Ouvrez WhatsApp sur votre téléphone &gt; Appareils connectés &gt; Connecter un appareil, puis scannez ce QR Code :
              </p>
              
              <div className="relative w-48 h-48 bg-white border border-border/50 rounded-2xl flex items-center justify-center p-2 shadow-md">
                <Image 
                  src={qrCode}
                  alt="WhatsApp QR Code"
                  width={180}
                  height={180}
                  priority
                  className="rounded-lg"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleCheckStatus} 
                  disabled={isChecking}
                  className="rounded-xl text-xs gap-1.5"
                >
                  {isChecking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Vérifier la connexion
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={handleConnect} 
                  disabled={isLoading}
                  className="rounded-xl text-xs text-destructive hover:bg-destructive/10"
                >
                  Régénérer le QR code
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                La connexion via QR Code ne nécessite pas de compte Meta Business vérifié ni de carte de crédit. Tout ce dont vous avez besoin est un numéro de téléphone avec WhatsApp actif.
              </p>
            </div>
          )}

          {/* Boutons d'action principaux */}
          <div className="flex gap-2 pt-2">
            {status === 'CONNECTED' ? (
              <Button 
                variant="destructive" 
                onClick={handleDisconnect} 
                disabled={isLoading}
                className="w-full sm:w-auto font-medium rounded-2xl gap-2"
              >
                <Power className="w-4 h-4" />
                Déconnecter WhatsApp
              </Button>
            ) : status === 'CONNECTING' && !qrCode ? (
              <Button 
                onClick={handleConnect} 
                disabled={isLoading}
                className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-primary-foreground font-medium rounded-2xl gap-2"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                Génération en cours...
              </Button>
            ) : !qrCode ? (
              <Button 
                onClick={handleConnect} 
                disabled={isLoading}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-medium rounded-2xl gap-2"
              >
                <Smartphone className="w-4 h-4" />
                Générer un QR Code
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
