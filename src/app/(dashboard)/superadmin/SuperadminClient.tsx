'use client'

import { useState, useTransition } from 'react'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  Store, 
  Users, 
  Phone, 
  Mail, 
  User, 
  Lock, 
  Check, 
  Loader2, 
  AlertCircle 
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { 
  createAccountAction, 
  updateAccountAction, 
  deleteEmployeeAction, 
  createSalonAction 
} from '@/actions/superadmin'

interface Salon {
  id: string
  name: string
  slug: string
  createdAt: Date
}

interface Employee {
  id: string
  name: string
  email: string | null
  phone: string | null
  role: 'MANAGER' | 'HAIRDRESSER'
  salonId: string
  userId: string | null
  salon: Salon
}

interface SuperadminClientProps {
  initialEmployees: any[]
  salons: Salon[]
}

export function SuperadminClient({ initialEmployees, salons }: SuperadminClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'employees' | 'salons'>('employees')
  const [isPending, startTransition] = useTransition()
  
  // Modals state
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  
  const [isSalonModalOpen, setIsSalonModalOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Form states - Account
  const [accountName, setAccountName] = useState('')
  const [accountEmail, setAccountEmail] = useState('')
  const [accountPassword, setAccountPassword] = useState('')
  const [accountPhone, setAccountPhone] = useState('')
  const [accountRole, setAccountRole] = useState<'MANAGER' | 'HAIRDRESSER'>('HAIRDRESSER')
  const [accountSalonId, setAccountSalonId] = useState(salons[0]?.id || '')

  // Form states - Salon
  const [salonName, setSalonName] = useState('')
  const [salonSlug, setSalonSlug] = useState('')

  const resetAccountForm = () => {
    setAccountName('')
    setAccountEmail('')
    setAccountPassword('')
    setAccountPhone('')
    setAccountRole('HAIRDRESSER')
    setAccountSalonId(salons[0]?.id || '')
    setEditingEmployee(null)
    setErrorMsg('')
  }

  const resetSalonForm = () => {
    setSalonName('')
    setSalonSlug('')
    setErrorMsg('')
  }

  const handleOpenCreateAccount = () => {
    resetAccountForm()
    setIsAccountModalOpen(true)
  }

  const handleOpenEditAccount = (emp: Employee) => {
    setEditingEmployee(emp)
    setAccountName(emp.name)
    setAccountEmail(emp.email || '')
    setAccountPhone(emp.phone || '')
    setAccountRole(emp.role)
    setAccountSalonId(emp.salonId)
    setIsAccountModalOpen(true)
  }

  const handleAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    startTransition(async () => {
      let res
      if (editingEmployee) {
        // Update
        res = await updateAccountAction(editingEmployee.id, {
          name: accountName,
          role: accountRole,
          salonId: accountSalonId,
          phone: accountPhone || null,
        })
      } else {
        // Create
        if (!accountPassword) {
          setErrorMsg('Le mot de passe est obligatoire pour la création.')
          return
        }
        res = await createAccountAction({
          name: accountName,
          email: accountEmail,
          password: accountPassword,
          role: accountRole,
          salonId: accountSalonId,
          phone: accountPhone || null,
        })
      }

      if (res.success) {
        setSuccessMsg(editingEmployee ? 'Compte mis à jour avec succès.' : 'Compte créé avec succès.')
        setIsAccountModalOpen(false)
        resetAccountForm()
        router.refresh()
      } else {
        setErrorMsg(res.error || "Une erreur s'est produite.")
      }
    })
  }

  const handleDeleteEmployee = (empId: string, name: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le compte de ${name} ? Cette action supprimera également son compte d'accès Supabase.`)) {
      return
    }

    startTransition(async () => {
      const res = await deleteEmployeeAction(empId)
      if (res.success) {
        setSuccessMsg('Compte supprimé avec succès.')
        router.refresh()
      } else {
        alert(res.error || 'Erreur lors de la suppression')
      }
    })
  }

  const handleSalonSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    startTransition(async () => {
      const res = await createSalonAction({
        name: salonName,
        slug: salonSlug,
      })

      if (res.success) {
        setSuccessMsg('Salon créé avec succès.')
        setIsSalonModalOpen(false)
        resetSalonForm()
        router.refresh()
      } else {
        setErrorMsg(res.error || "Une erreur s'est produite.")
      }
    })
  }

  const autoGenerateSlug = (val: string) => {
    setSalonName(val)
    const slug = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[^a-z0-9\s-]/g, '') // remove invalid chars
      .replace(/\s+/g, '-') // collapse whitespace and replace by -
      .replace(/-+/g, '-') // collapse dashes
      .trim()
    setSalonSlug(slug)
  }

  return (
    <div className="space-y-6">
      
      {/* Messages de succès ou d'erreur */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Check className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border/50 gap-4">
        <button
          onClick={() => setActiveTab('employees')}
          className={`pb-4 px-2 text-sm font-semibold relative transition-colors ${
            activeTab === 'employees' 
              ? 'text-primary' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>Comptes Utilisateurs ({initialEmployees.length})</span>
          </div>
          {activeTab === 'employees' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full animate-in fade-in duration-300" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('salons')}
          className={`pb-4 px-2 text-sm font-semibold relative transition-colors ${
            activeTab === 'salons' 
              ? 'text-primary' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4" />
            <span>Salons ({salons.length})</span>
          </div>
          {activeTab === 'salons' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full animate-in fade-in duration-300" />
          )}
        </button>
      </div>

      {/* Content Area */}
      {activeTab === 'employees' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Liste des comptes</h2>
            <button
              onClick={handleOpenCreateAccount}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-2xl shadow-sm hover:bg-primary/90 transition-all active:scale-98 text-sm touch-target"
            >
              <Plus className="w-4 h-4" />
              <span>Créer un compte</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {initialEmployees.map((emp) => (
              <div 
                key={emp.id} 
                className="glass-card rounded-[1.8rem] p-6 flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg border-2 border-stone-200/60 dark:border-stone-800"
              >
                {/* Subtle top role border decorator */}
                <div className={`absolute top-0 inset-x-0 h-1.5 ${
                  emp.role === 'MANAGER' ? 'bg-amber-500' : 'bg-primary'
                }`} />

                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-lg text-primary bg-primary/10 shadow-inner`}>
                        {emp.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground truncate max-w-[150px]">{emp.name}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                            emp.role === 'MANAGER' 
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' 
                              : 'bg-primary/10 text-primary border-primary/20'
                          }`}>
                            {emp.role === 'MANAGER' ? 'Manager' : 'Coiffeur'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5 my-4 pt-3 border-t border-border/50 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-4 h-4 text-stone-400 flex-shrink-0" />
                      <span className="truncate">{emp.email || 'Pas d\'email'}</span>
                    </div>
                    {emp.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-stone-400 flex-shrink-0" />
                        <span>{emp.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-stone-400 flex-shrink-0" />
                      <span className="font-semibold text-foreground truncate">{emp.salon.name}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-border/50 pt-4 mt-2">
                  <button
                    onClick={() => handleOpenEditAccount(emp)}
                    className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors touch-target"
                    title="Modifier le compte"
                  >
                    <Edit className="w-4.5 h-4.5" />
                  </button>
                  {emp.email !== 'mehdielebbar7@gmail.com' && (
                    <button
                      onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                      className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors touch-target"
                      title="Supprimer le compte"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'salons' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Salons configurés</h2>
            <button
              onClick={() => setIsSalonModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-2xl shadow-sm hover:bg-primary/90 transition-all active:scale-98 text-sm touch-target"
            >
              <Plus className="w-4 h-4" />
              <span>Créer un salon</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {salons.map((salon) => (
              <div 
                key={salon.id} 
                className="glass-card rounded-[1.8rem] p-6 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg border-2 border-stone-200/60 dark:border-stone-800"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Store className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-foreground text-lg">{salon.name}</h3>
                    <p className="text-xs font-mono text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded-lg inline-block">
                      slug: {salon.slug}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Créé le {new Date(salon.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Account Creation/Edition Modal */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="glass-card rounded-[2.2rem] max-w-md w-full p-8 shadow-2xl relative border-2 border-stone-200 dark:border-stone-850 animate-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-bold tracking-tight text-foreground mb-6">
              {editingEmployee ? 'Modifier le compte' : 'Créer un nouveau compte'}
            </h3>

            {errorMsg && (
              <div className="p-3 mb-4 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleAccountSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Nom complet</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Ex: Jean Dupont"
                    className="w-full bg-secondary/50 border border-border rounded-xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Adresse Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-stone-400" />
                  <input
                    type="email"
                    required
                    disabled={!!editingEmployee}
                    value={accountEmail}
                    onChange={(e) => setAccountEmail(e.target.value)}
                    placeholder="Ex: jean.dupont@email.com"
                    className="w-full bg-secondary/50 border border-border rounded-xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {!editingEmployee && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Mot de passe temporaire</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-stone-400" />
                    <input
                      type="password"
                      required
                      value={accountPassword}
                      onChange={(e) => setAccountPassword(e.target.value)}
                      placeholder="Min. 6 caractères"
                      className="w-full bg-secondary/50 border border-border rounded-xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-foreground"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Numéro de téléphone</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-stone-400" />
                  <input
                    type="text"
                    value={accountPhone}
                    onChange={(e) => setAccountPhone(e.target.value)}
                    placeholder="Ex: +212600000000"
                    className="w-full bg-secondary/50 border border-border rounded-xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Rôle</label>
                  <select
                    value={accountRole}
                    onChange={(e) => setAccountRole(e.target.value as any)}
                    className="w-full bg-secondary/50 border border-border rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all text-foreground cursor-pointer"
                  >
                    <option value="HAIRDRESSER">Coiffeur</option>
                    <option value="MANAGER">Manager</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Salon affecté</label>
                  <select
                    value={accountSalonId}
                    onChange={(e) => setAccountSalonId(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all text-foreground cursor-pointer"
                  >
                    {salons.map((salon) => (
                      <option key={salon.id} value={salon.id}>
                        {salon.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-secondary text-foreground font-semibold rounded-xl hover:bg-secondary/80 transition-colors text-sm touch-target"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-3 px-4 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-75 disabled:pointer-events-none touch-target"
                >
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingEmployee ? 'Enregistrer' : 'Créer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Salon Creation Modal */}
      {isSalonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="glass-card rounded-[2.2rem] max-w-md w-full p-8 shadow-2xl relative border-2 border-stone-200 dark:border-stone-850 animate-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-bold tracking-tight text-foreground mb-6">
              Créer un nouveau salon
            </h3>

            {errorMsg && (
              <div className="p-3 mb-4 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSalonSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Nom du salon</label>
                <input
                  type="text"
                  required
                  value={salonName}
                  onChange={(e) => autoGenerateSlug(e.target.value)}
                  placeholder="Ex: Salon de l'Étoile"
                  className="w-full bg-secondary/50 border border-border rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-foreground"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Slug (identifiant unique URL)</label>
                <input
                  type="text"
                  required
                  value={salonSlug}
                  onChange={(e) => setSalonSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  placeholder="Ex: salon-etoile"
                  className="w-full bg-secondary/50 border border-border rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-foreground font-mono text-xs"
                />
              </div>

              <div className="flex items-center gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsSalonModalOpen(false)
                    resetSalonForm()
                  }}
                  className="flex-1 py-3 px-4 bg-secondary text-foreground font-semibold rounded-xl hover:bg-secondary/80 transition-colors text-sm touch-target"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-3 px-4 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-75 disabled:pointer-events-none touch-target"
                >
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Créer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
