import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, User, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/actions/clients'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useTransition } from 'react'

export function ClientSelector({ clients, selectedClient, onSelect, salonId }: any) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  
  const filteredClients = clients.filter((c: any) => 
    c.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone && c.phone.includes(searchQuery))
  ).slice(0, 5)

  if (selectedClient) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Client sélectionné
            </div>
            <Button variant="ghost" size="sm" onClick={() => onSelect(null)}>
              <X className="w-4 h-4 mr-2" /> Changer
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-xl">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
              {selectedClient.firstName?.[0]}{selectedClient.lastName?.[0]}
            </div>
            <div>
              <p className="font-semibold text-lg">{selectedClient.firstName} {selectedClient.lastName}</p>
              <p className="text-muted-foreground">{selectedClient.phone || 'Aucun numéro'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          Sélectionner un client
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher par nom ou téléphone..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {searchQuery && (
          <div className="space-y-2 border rounded-xl p-2 bg-background/50">
            {filteredClients.map((client: any) => (
              <div 
                key={client.id} 
                className="flex items-center justify-between p-2 hover:bg-muted rounded-lg cursor-pointer transition-colors"
                onClick={() => {
                  onSelect(client)
                  setSearchQuery('')
                }}
              >
                <div>
                  <p className="font-medium">{client.firstName} {client.lastName}</p>
                  <p className="text-xs text-muted-foreground">{client.phone}</p>
                </div>
                <Button variant="ghost" size="sm">Sélectionner</Button>
              </div>
            ))}
            {filteredClients.length === 0 && (
              <div className="text-center p-4 text-muted-foreground text-sm">
                Aucun client trouvé
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => onSelect({ id: null, firstName: 'Client', lastName: 'Passager' })}>
            Client passager
          </Button>
          <Button variant="secondary" className="flex-1" onClick={() => setIsDialogOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Nouveau
          </Button>
        </div>
      </CardContent>

      {/* Modal Nouveau Client Essentiel */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[440px] bg-white dark:bg-slate-950 border-border rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Nouveau Client</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Créez rapidement un client avec les informations essentielles.
            </DialogDescription>
          </DialogHeader>
          <form 
            className="space-y-4 py-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (!firstName || !lastName) {
                toast.error('Le prénom et le nom sont requis.')
                return
              }
              startTransition(async () => {
                try {
                  const newClient = await createClient({
                    firstName,
                    lastName,
                    phone: phone || undefined,
                    whatsappOptOut: false,
                    salonId,
                  })
                  toast.success('Client créé avec succès !')
                  setFirstName('')
                  setLastName('')
                  setPhone('')
                  setIsDialogOpen(false)
                  // On auto-sélectionne le client créé
                  onSelect(newClient)
                } catch (err: any) {
                  toast.error(err.message || 'Erreur lors de la création.')
                }
              })
            }}
          >
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
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">
                Annuler
              </Button>
              <Button type="submit" disabled={isPending} className="rounded-xl shadow-md shadow-primary/20">
                {isPending ? 'Création...' : 'Créer et Sélectionner'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
