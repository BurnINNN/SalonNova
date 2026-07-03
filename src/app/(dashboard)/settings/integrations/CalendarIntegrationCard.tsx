'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Copy, Check, RefreshCw, AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { regenerateCalendarToken } from '@/actions/calendar'

interface CalendarIntegrationCardProps {
  employeeId: string
  initialToken: string
}

export default function CalendarIntegrationCard({
  employeeId,
  initialToken,
}: CalendarIntegrationCardProps) {
  const [token, setToken] = useState(initialToken)
  const [isCopying, setIsCopying] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Construction du lien webcal:// à partir du protocole HTTP/HTTPS courant
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const webcalUrl = origin
    ? origin.replace(/^https?:/, 'webcal:') + `/api/calendar?token=${token}`
    : ''

  const handleCopy = async () => {
    if (!webcalUrl) return
    try {
      await navigator.clipboard.writeText(webcalUrl)
      setIsCopying(true)
      toast.success('Lien de synchronisation copié ! 📋')
      setTimeout(() => setIsCopying(false), 2000)
    } catch (err) {
      toast.error('Échec de la copie automatique.')
    }
  }

  const handleRegenerate = async () => {
    const confirmed = window.confirm(
      'Attention ! Si vous régénérez ce jeton, votre lien de calendrier actuel sera immédiatement désactivé sur votre iPhone et vos autres appareils configurés. Vous devrez copier et ajouter le nouveau lien. Voulez-vous continuer ?'
    )
    if (!confirmed) return

    setIsRegenerating(true)
    try {
      const res = await regenerateCalendarToken(employeeId)
      if (res.success && res.token) {
        setToken(res.token)
        toast.success('Jeton de calendrier régénéré ✓')
      } else {
        toast.error('Erreur lors de la régénération du jeton.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Une erreur est survenue.')
    } finally {
      setIsRegenerating(false)
    }
  }

  if (!mounted) {
    return (
      <Card className="glass-card border-border/50 shadow-sm bg-card/40 backdrop-blur-md animate-pulse">
        <div className="h-64" />
      </Card>
    )
  }

  return (
    <Card className="glass-card border-border/50 shadow-sm bg-card/40 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Calendar className="w-5 h-5 text-amber-500 dark:text-amber-400" />
          Synchronisation Calendrier (iPhone & Apple)
        </CardTitle>
        <CardDescription>
          Abonnez-vous à votre agenda en temps réel directement dans l'application Calendrier (iOS / macOS).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Cette fonctionnalité crée un lien d'abonnement au format standard iCalendar (.ics) contenant vos prestations, les noms de vos clients et les horaires de vos rendez-vous.
        </p>

        {/* Zone de lien de synchronisation */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Votre Lien de Calendrier
          </label>
          <div className="flex gap-2 items-center">
            <div className="flex-1 font-mono text-xs select-all bg-secondary/40 border border-border/40 px-3 py-2.5 rounded-2xl text-foreground/80 overflow-x-auto whitespace-nowrap scrollbar-thin">
              {webcalUrl}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
              className="rounded-xl flex-shrink-0 bg-background/50 hover:bg-background border-border/50 active:scale-95 transition-transform"
              title="Copier le lien"
            >
              {isCopying ? (
                <Check className="w-4 h-4 text-green-500 animate-in zoom-in" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>

        {/* Alerte de sécurité */}
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 p-4 rounded-2xl text-sm flex gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-200">Lien personnel et privé</p>
            <p className="text-xs mt-1 text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
              Ce lien contient un jeton unique qui donne accès en lecture seule à votre agenda. Ne le partagez jamais. Si vous pensez qu'il a été compromis, régénérez-le ci-dessous.
            </p>
          </div>
        </div>

        {/* Section Instructions pliante */}
        <div className="border border-border/40 rounded-2xl overflow-hidden bg-secondary/10">
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="w-full flex items-center justify-between p-3.5 text-sm font-medium text-foreground hover:bg-secondary/20 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-500" />
              Comment configurer sur mon appareil ?
            </span>
            {showInstructions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showInstructions && (
            <div className="p-4 border-t border-border/30 space-y-4 text-xs text-muted-foreground leading-relaxed animate-in slide-in-from-top-2 duration-200">
              <div>
                <h4 className="font-semibold text-foreground mb-1">📱 Sur iPhone / iPad (iOS) :</h4>
                <ol className="list-decimal list-inside space-y-1.5 pl-1">
                  <li>Touchez et maintenez le lien ci-dessus pour le copier entièrement.</li>
                  <li>Ouvrez l'application <strong className="text-foreground">Réglages</strong> de votre iPhone.</li>
                  <li>Allez dans <strong className="text-foreground">Calendrier</strong> &gt; <strong className="text-foreground">Comptes</strong> &gt; <strong className="text-foreground">Ajouter un compte</strong>.</li>
                  <li>Sélectionnez <strong className="text-foreground">Autre</strong> (tout en bas).</li>
                  <li>Choisissez <strong className="text-foreground">Ajouter un calendrier avec abonnement</strong>.</li>
                  <li>Collez le lien de calendrier puis touchez <strong className="text-foreground">Suivant</strong>.</li>
                  <li>Vérifiez les options puis validez avec <strong className="text-foreground">Enregistrer</strong>.</li>
                </ol>
              </div>

              <hr className="border-border/20" />

              <div>
                <h4 className="font-semibold text-foreground mb-1">💻 Sur Mac (macOS) :</h4>
                <ol className="list-decimal list-inside space-y-1.5 pl-1">
                  <li>Copiez le lien ci-dessus.</li>
                  <li>Ouvrez l'application <strong className="text-foreground">Calendrier</strong> sur votre Mac.</li>
                  <li>Dans la barre de menu, cliquez sur <strong className="text-foreground">Fichier</strong> &gt; <strong className="text-foreground">Nouvel abonnement calendrier...</strong>.</li>
                  <li>Collez le lien de calendrier et cliquez sur <strong className="text-foreground">S'abonner</strong>.</li>
                  <li>Réglez le lieu sur <strong className="text-foreground">Sur mon Mac</strong> ou <strong className="text-foreground">iCloud</strong> (pour le synchroniser sur votre iPhone automatiquement), réglez l'actualisation sur <strong className="text-foreground">Toutes les heures</strong>, puis validez.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Actions secondaires */}
        <div className="flex justify-end pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive rounded-xl gap-1.5 transition-colors"
          >
            {isRegenerating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            Régénérer le jeton sécurisé
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
