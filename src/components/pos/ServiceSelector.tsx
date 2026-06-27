import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Scissors, Trash2, Tag } from 'lucide-react'
import { useState, useMemo } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { POSLine } from './POSScreen'

interface ServiceSelectorProps {
  services: any[]
  lines: POSLine[]
  onAddLine: (line: POSLine) => void
  onUpdateLine: (id: string, updates: Partial<POSLine>) => void
  onRemoveLine: (id: string) => void
}

export function ServiceSelector({ services, lines, onAddLine, onUpdateLine, onRemoveLine }: ServiceSelectorProps) {
  const handleAddService = (service: any) => {
    onAddLine({
      id: Math.random().toString(36).substr(2, 9),
      label: service.name,
      quantity: 1,
      unitPrice: service.price,
      totalPrice: service.price,
      serviceId: service.id
    })
  }

  const categories = useMemo(() => {
    const cats: any[] = []
    services.forEach(s => {
      if (s.category && !cats.find(c => c.id === s.category.id)) {
        cats.push(s.category)
      }
    })
    return cats.sort((a, b) => a.order - b.order)
  }, [services])

  const [activeCategory, setActiveCategory] = useState<string>('all')

  const filteredServices = activeCategory === 'all' 
    ? services 
    : services.filter(s => s.categoryId === activeCategory)

  return (
    <Card className="glass-card flex-1 min-h-[400px]">
      <CardHeader className="pb-3 border-b border-border/50">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-primary" />
            Prestations
          </div>
          <span className="text-muted-foreground text-sm font-normal bg-muted px-2 py-0.5 rounded-full">
            {lines.length} ligne(s)
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0 flex flex-col lg:flex-row h-full">
        {/* Grille des prestations */}
        <div className="w-full lg:w-2/3 p-4 border-r border-border/50 overflow-y-auto max-h-[700px] flex flex-col">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Button 
              variant={activeCategory === 'all' ? 'default' : 'outline'} 
              size="sm" 
              className="rounded-full shrink-0"
              onClick={() => setActiveCategory('all')}
            >
              Toutes
            </Button>
            {categories.map(cat => (
              <Button 
                key={cat.id} 
                variant={activeCategory === cat.id ? 'default' : 'outline'} 
                size="sm" 
                className="rounded-full shrink-0 flex items-center gap-1"
                onClick={() => setActiveCategory(cat.id)}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color || '#000' }} />
                {cat.name}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 flex-1 content-start">
            {filteredServices.map((s: any) => (
              <Button
                key={s.id}
                variant="outline"
                className="h-auto py-3 px-2 flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:bg-primary/5 transition-all text-center whitespace-normal bg-background"
                onClick={() => handleAddService(s)}
              >
                <span className="font-semibold">{s.name}</span>
                <span className="text-xs text-muted-foreground">{s.price} DH</span>
              </Button>
            ))}
            {filteredServices.length === 0 && (
              <div className="col-span-2 text-center text-sm text-muted-foreground py-8">
                Aucune prestation dans cette catégorie.
              </div>
            )}
          </div>
        </div>

        {/* Lignes ajoutées */}
        <div className="w-full lg:w-1/3 p-4 bg-muted/20 overflow-y-auto max-h-[700px] flex flex-col">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Panier</h3>
          
          <div className="space-y-3">
            {lines.map((line) => (
              <div key={line.id} className="bg-background rounded-xl p-3 border border-border shadow-sm flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium truncate text-sm flex-1">{line.label}</p>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0" onClick={() => onRemoveLine(line.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Prix :</span>
                    <div className="relative">
                      <Input 
                        type="number" 
                        value={line.unitPrice} 
                        onChange={(e) => onUpdateLine(line.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                        className="w-20 h-7 text-xs font-semibold"
                      />
                    </div>
                  </div>
                  <span className="font-bold text-primary">{line.totalPrice} DH</span>
                </div>
              </div>
            ))}

            {lines.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground opacity-50">
                <Scissors className="w-8 h-8 mb-2" />
                <p className="text-sm">Panier vide</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
