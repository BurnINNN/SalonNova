'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/actions/clients'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Search, UserPlus, Phone, Calendar } from 'lucide-react'

interface ClientData {
  id: string
  firstName: string
  lastName: string
  phone: string | null
  _count: { appointments: number }
  hairProfile?: { colorFormula: string | null; hairType: string | null } | null
}

export function ClientList({ clients, salonId }: { clients: ClientData[]; salonId: string }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsappOptOut, setWhatsappOptOut] = useState(false)

  const filtered = search
    ? clients.filter(c =>
        `${c.firstName} ${c.lastName} ${c.phone ?? ''}`.toLowerCase().includes(search.toLowerCase())
      )
    : clients

  function resetForm() {
    setFirstName('')
    setLastName('')
    setPhone('')
    setWhatsappOptOut(false)
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName || !lastName) {
      toast.error('Le prénom et nom sont requis.')
      return
    }

    startTransition(async () => {
      try {
        await createClient({
          firstName,
          lastName,
          phone: phone || undefined,
          whatsappOptOut,
          salonId,
        })
        toast.success('Client créé avec succès ✓')
        resetForm()
        setIsDialogOpen(false)
        router.refresh()
      } catch (err: any) {
        toast.error(err.message || 'Erreur lors de la création.')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Search + Add */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, prénom ou téléphone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="rounded-xl shadow-sm">
          <UserPlus className="w-4 h-4 mr-2" />
          Nouveau client
        </Button>
      </div>

      {/* Client Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">👤</div>
          <p className="text-muted-foreground text-sm">
            {search ? 'Aucun client trouvé.' : 'Aucun client enregistré.'}
          </p>
          {!search && (
            <Button onClick={() => setIsDialogOpen(true)} variant="outline" className="mt-4 rounded-xl">
              Ajouter votre premier client
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((client) => (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className="glass-card rounded-2xl p-5 hover:shadow-md transition-all duration-300 group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {client.firstName} {client.lastName}
                  </h3>
                  {client.phone && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Phone className="w-3 h-3" />
                      {client.phone}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
                  <Calendar className="w-3 h-3" />
                  {client._count.appointments}
                </div>
              </div>
              {client.hairProfile?.hairType && (
                <p className="text-xs text-muted-foreground mt-3 bg-secondary/50 rounded-lg px-2 py-1 inline-block">
                  {client.hairProfile.hairType}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* New Client Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[440px] glass-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Nouveau Client</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Ajoutez un client à votre répertoire.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom <span className="text-destructive">*</span></Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Prénom"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom <span className="text-destructive">*</span></Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Nom"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+212 6XX XXX XXX"
              />
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <input 
                type="checkbox" 
                id="whatsappOptOut" 
                checked={whatsappOptOut}
                onChange={(e) => setWhatsappOptOut(e.target.checked)}
                className="w-4 h-4 text-primary bg-secondary border-border rounded focus:ring-primary"
              />
              <Label htmlFor="whatsappOptOut" className="text-sm font-normal">Ne pas envoyer de rappels WhatsApp</Label>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">
                Annuler
              </Button>
              <Button type="submit" disabled={isPending} className="rounded-xl shadow-md shadow-primary/20">
                {isPending ? 'Création...' : 'Créer le client'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
