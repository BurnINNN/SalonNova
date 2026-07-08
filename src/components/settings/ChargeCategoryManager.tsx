'use client'

import { useState } from 'react'
import { createChargeCategory, updateChargeCategory, deleteChargeCategory } from '@/actions/charges'
import { toast } from 'sonner'
import { Plus, Trash2, Pencil, Check, X, Tag } from 'lucide-react'

interface ChargeCategory {
  id: string
  name: string
  icon: string | null
  color: string | null
}

interface ChargeCategoryManagerProps {
  categories: ChargeCategory[]
  salonId: string
}

const ICONS = ['💧', '⚡', '🧴', '🧹', '🧤', '✂️', '🪒', '🧻', '🔧', '📦']
const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

export function ChargeCategoryManager({ categories: initialCategories, salonId }: ChargeCategoryManagerProps) {
  const [categories, setCategories] = useState<ChargeCategory[]>(initialCategories)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('📦')
  const [newColor, setNewColor] = useState('#3b82f6')
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleAdd() {
    if (!newName.trim()) {
      toast.error('Le nom est obligatoire')
      return
    }
    setIsSubmitting(true)
    try {
      const cat = await createChargeCategory({
        salonId,
        name: newName.trim(),
        icon: newIcon,
        color: newColor,
      })
      setCategories(prev => [...prev, cat])
      setNewName('')
      setNewIcon('📦')
      setIsAdding(false)
      toast.success('Catégorie créée')
    } catch (error) {
      toast.error('Erreur lors de la création')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleUpdate(id: string) {
    if (!editName.trim()) return
    setIsSubmitting(true)
    try {
      const updated = await updateChargeCategory(id, { name: editName.trim() })
      setCategories(prev =>
        prev.map(c => (c.id === id ? { ...c, name: updated.name } : c))
      )
      setEditingId(null)
      toast.success('Catégorie modifiée')
    } catch (error) {
      toast.error('Erreur lors de la modification')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    setIsSubmitting(true)
    try {
      await deleteChargeCategory(id)
      setCategories(prev => prev.filter(c => c.id !== id))
      toast.success('Catégorie supprimée')
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
          <Tag className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Catégories de Charges</h2>
          <p className="text-sm text-muted-foreground">
            Définissez les types de charges opérationnelles à suivre par prestation.
          </p>
        </div>
      </div>

      {/* Liste des catégories */}
      <div className="space-y-2">
        {categories.length === 0 && !isAdding && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Aucune catégorie créée. Ajoutez-en une pour commencer le suivi des charges.
          </p>
        )}

        {categories.map(cat => (
          <div
            key={cat.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/50 group hover:border-border transition-colors"
          >
            <span className="text-lg">{cat.icon || '📦'}</span>
            {cat.color && (
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: cat.color }}
              />
            )}

            {editingId === cat.id ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 h-8 rounded-lg border border-input bg-background px-2 text-sm focus:ring-2 focus:ring-ring outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdate(cat.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                />
                <button
                  onClick={() => handleUpdate(cat.id)}
                  disabled={isSubmitting}
                  className="p-1.5 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                <span className="flex-1 text-sm font-medium">{cat.name}</span>
                <button
                  onClick={() => {
                    setEditingId(cat.id)
                    setEditName(cat.name)
                  }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(cat.id)}
                  disabled={isSubmitting}
                  className="p-1.5 rounded-lg text-destructive/70 hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Formulaire d'ajout */}
      {isAdding ? (
        <div className="space-y-3 p-4 rounded-xl bg-secondary/20 border border-border/50">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nom de la catégorie (ex: Eau, Électricité...)"
            className="w-full h-10 rounded-xl border border-input bg-background/50 px-3 text-sm focus:ring-2 focus:ring-ring outline-none"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
            }}
          />

          {/* Sélecteur d'icône */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Icône</span>
            <div className="flex flex-wrap gap-1.5">
              {ICONS.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setNewIcon(icon)}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all border ${
                    newIcon === icon
                      ? 'bg-primary/10 border-primary shadow-sm scale-110'
                      : 'bg-background/50 border-transparent hover:border-border'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Sélecteur de couleur */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Couleur</span>
            <div className="flex flex-wrap gap-1.5">
              {COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewColor(color)}
                  className={`w-7 h-7 rounded-full transition-all ${
                    newColor === color ? 'ring-2 ring-primary ring-offset-2 scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setIsAdding(false)}
              className="flex-1 h-9 rounded-xl border border-input text-sm font-medium hover:bg-secondary/50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleAdd}
              disabled={isSubmitting || !newName.trim()}
              className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Création...' : 'Créer'}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border-2 border-dashed border-border/50 text-sm font-medium text-muted-foreground hover:border-primary/30 hover:text-primary transition-all"
        >
          <Plus className="w-4 h-4" />
          Nouvelle catégorie
        </button>
      )}
    </div>
  )
}
