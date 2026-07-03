'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { updateSalon, UpdateSalonInput, SalonSettingsType } from '@/actions/salon'
import { Save, Store, Globe, MessageCircle, Bot, MapPin } from 'lucide-react'

// Local schema matching the server schema
const SettingsFormSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  settings: z.object({
    currency: z.string().default('MAD'),
    timezone: z.string().default('Africa/Casablanca'),
    llmProvider: z.enum(['gemini']).default('gemini'),
    whatsappInstanceName: z.string().optional(),
    instagramPageId: z.string().optional(),
    messengerPageId: z.string().optional(),
    // Champs Salon / IA
    address: z.string().optional(),
    googleMapsUrl: z.string().optional(),
    phone: z.string().optional(),
    openingHours: z.string().optional(),
    language: z.string().default('français'),
    aiName: z.string().optional(),
    aiTone: z.string().default('chaleureux et professionnel'),
    hairCareRules: z.string().optional(),
  })
})

type SettingsFormData = z.infer<typeof SettingsFormSchema>

const inputClass = "w-full flex h-10 rounded-xl border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
const selectClass = "w-full flex h-10 rounded-xl border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
const textareaClass = "w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px] resize-y"

interface SalonSettingsFormProps {
  salon: {
    id: string
    name: string
    settings: SalonSettingsType
  }
}

export function SalonSettingsForm({ salon }: SalonSettingsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(SettingsFormSchema) as any,
    defaultValues: {
      name: salon.name,
      settings: {
        currency: salon.settings.currency || 'MAD',
        timezone: salon.settings.timezone || 'Africa/Casablanca',
        llmProvider: salon.settings.llmProvider || 'gemini',
        whatsappInstanceName: salon.settings.whatsappInstanceName || '',
        instagramPageId: salon.settings.instagramPageId || '',
        messengerPageId: salon.settings.messengerPageId || '',
        address: salon.settings.address || '',
        googleMapsUrl: salon.settings.googleMapsUrl || '',
        phone: salon.settings.phone || '',
        openingHours: salon.settings.openingHours || '',
        language: salon.settings.language || 'français',
        aiName: salon.settings.aiName || '',
        aiTone: salon.settings.aiTone || 'chaleureux et professionnel',
        hairCareRules: salon.settings.hairCareRules || '',
      },
    },
  })

  async function onSubmit(data: SettingsFormData) {
    setIsSubmitting(true)
    try {
      await updateSalon(salon.id, data)
      toast.success('Paramètres mis à jour avec succès')
    } catch (error) {
      console.error(error)
      toast.error('Erreur lors de la mise à jour des paramètres')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      {/* Informations Générales */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Store className="w-4 h-4" />
          </div>
          <h2 className="text-xl font-semibold">Informations Générales</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nom du salon <span className="text-destructive">*</span></label>
            <input
              {...form.register('name')}
              className={inputClass}
              placeholder="Ex: Salon Lumière"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Téléphone du salon</label>
            <input
              {...form.register('settings.phone')}
              className={inputClass}
              placeholder="Ex: +212 6XX XX XX XX"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Adresse complète</label>
            <input
              {...form.register('settings.address')}
              className={inputClass}
              placeholder="Ex: 12 rue des Arts, Casablanca"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              Lien Google Maps
            </label>
            <input
              {...form.register('settings.googleMapsUrl')}
              className={inputClass}
              placeholder="Ex: https://maps.google.com/..."
            />
            <p className="text-xs text-muted-foreground">
              Collez le lien de votre salon sur Google Maps pour que les clients puissent vous trouver facilement.
            </p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Horaires d'ouverture</label>
            <input
              {...form.register('settings.openingHours')}
              className={inputClass}
              placeholder="Ex: Lun-Sam 9h-19h, Dim fermé"
            />
          </div>
        </div>
      </div>

      {/* Localisation & Devises */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Globe className="w-4 h-4" />
          </div>
          <h2 className="text-xl font-semibold">Localisation & Devise</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Devise par défaut</label>
            <select
              {...form.register('settings.currency')}
              className={selectClass}
            >
              <option value="MAD">Dirham Marocain (MAD)</option>
              <option value="EUR">Euro (€)</option>
              <option value="USD">Dollar Américain ($)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Fuseau horaire</label>
            <select
              {...form.register('settings.timezone')}
              className={selectClass}
            >
              <option value="Africa/Casablanca">Africa/Casablanca</option>
              <option value="Europe/Paris">Europe/Paris</option>
              <option value="America/New_York">America/New_York</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assistante IA */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-600">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Assistante IA</h2>
            <p className="text-sm text-muted-foreground">Personnalisez le comportement de votre assistante virtuelle.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Prénom de l'IA</label>
            <input
              {...form.register('settings.aiName')}
              className={inputClass}
              placeholder="Ex: Sofia, Nadia, Yasmine..."
            />
            <p className="text-xs text-muted-foreground">
              Si vide, l'IA s'appellera "Sofia" par défaut.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Ton de communication</label>
            <select
              {...form.register('settings.aiTone')}
              className={selectClass}
            >
              <option value="chaleureux et professionnel">Chaleureux et professionnel</option>
              <option value="décontracté et amical">Décontracté et amical</option>
              <option value="formel et élégant">Formel et élégant</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Langue de l'IA</label>
            <select
              {...form.register('settings.language')}
              className={selectClass}
            >
              <option value="français">Français</option>
              <option value="français et anglais">Français & Anglais</option>
              <option value="anglais">Anglais</option>
              <option value="arabe et français">Arabe & Français</option>
            </select>
            <p className="text-xs text-muted-foreground">
              L'IA répondra toujours dans la langue du client, mais cette option définit la langue par défaut.
            </p>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <label className="text-sm font-medium">Règles de conseil capillaire (optionnel)</label>
          <textarea
            {...form.register('settings.hairCareRules')}
            className={textareaClass}
            rows={6}
            placeholder={`Ex:\nRÈGLE 1 — Cheveux très abîmés\n→ Ne jamais proposer : balayage, coloration\n→ Proposer à la place : soin kératine, masque\n→ Explication : "Les cheveux fragilisés doivent être renforcés avant une coloration."`}
          />
          <p className="text-xs text-muted-foreground">
            Écrivez vos propres règles de conseil. L'IA les utilisera pour déconseiller les prestations inadaptées. 
            Si vide, des règles par défaut seront utilisées.
          </p>
        </div>
      </div>



      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || !form.formState.isDirty}
          className="flex items-center gap-2 h-10 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {isSubmitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </button>
      </div>
    </form>
  )
}
