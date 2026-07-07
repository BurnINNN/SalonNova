import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Scissors, Trash2, Package, Search } from 'lucide-react'
import { useState, useMemo } from 'react'
import { POSLine } from './POSScreen'

interface ServiceSelectorProps {
  services: any[]
  products?: any[]
  lines: POSLine[]
  onAddLine: (line: POSLine) => void
  onUpdateLine: (id: string, updates: Partial<POSLine>) => void
  onRemoveLine: (id: string) => void
}

export function ServiceSelector({ services, products = [], lines, onAddLine, onUpdateLine, onRemoveLine }: ServiceSelectorProps) {
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

  const handleAddProduct = (product: any) => {
    onAddLine({
      id: Math.random().toString(36).substr(2, 9),
      label: product.name,
      quantity: 1,
      unitPrice: product.sellingPrice,
      totalPrice: product.sellingPrice,
      productId: product.id
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
  const [searchQuery, setSearchQuery] = useState('')

  const filteredServices = useMemo(() => {
    let result = services
    if (activeCategory !== 'all') {
      result = result.filter(s => s.categoryId === activeCategory)
    }
    if (searchQuery) {
      result = result.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    }
    return result
  }, [services, activeCategory, searchQuery])

  const filteredProducts = useMemo(() => {
    let result = products
    if (searchQuery) {
      result = result.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }
    return result
  }, [products, searchQuery])

  return (
    <Card className="glass-card flex-1 min-h-[400px]">
      <CardHeader className="pb-3 border-b border-border/50">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-primary" />
            Prestations & Produits
          </div>
          <span className="text-muted-foreground text-sm font-normal bg-muted px-2 py-0.5 rounded-full">
            {lines.length} ligne(s)
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0 flex flex-col lg:flex-row h-full">
        {/* Grille des prestations / produits */}
        <div className="w-full lg:w-2/3 p-4 border-r border-border/50 overflow-y-auto max-h-[700px] flex flex-col">
          {/* Search bar at the top */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={activeCategory === 'products' ? "Rechercher un produit..." : "Rechercher une prestation..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Unified filters list */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Button 
              variant={activeCategory === 'all' ? 'default' : 'outline'} 
              size="sm" 
              className="rounded-full shrink-0"
              onClick={() => {
                setActiveCategory('all')
                setSearchQuery('')
              }}
            >
              Toutes (Prestations)
            </Button>
            {categories.map(cat => (
              <Button 
                key={cat.id} 
                variant={activeCategory === cat.id ? 'default' : 'outline'} 
                size="sm" 
                className="rounded-full shrink-0 flex items-center gap-1"
                onClick={() => {
                  setActiveCategory(cat.id)
                  setSearchQuery('')
                }}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color || '#000' }} />
                {cat.name}
              </Button>
            ))}
            
            {/* Virtual Category: Produits */}
            <Button 
              variant={activeCategory === 'products' ? 'default' : 'outline'} 
              size="sm" 
              className="rounded-full shrink-0 flex items-center gap-1.5"
              onClick={() => {
                setActiveCategory('products')
                setSearchQuery('')
              }}
            >
              <Package className="w-3.5 h-3.5" />
              Produits ({products.length})
            </Button>
          </div>

          {/* Display grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 flex-1 content-start">
            {activeCategory === 'products' ? (
              <>
                {filteredProducts.map((p: any) => (
                  <Button
                    key={p.id}
                    variant="outline"
                    className="h-auto py-3 px-2 flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:bg-primary/5 transition-all text-center whitespace-normal bg-background relative"
                    onClick={() => handleAddProduct(p)}
                  >
                    <span className="font-semibold text-sm">{p.name}</span>
                    {p.brand && <span className="text-[10px] text-muted-foreground">{p.brand}</span>}
                    <span className="text-xs font-bold text-primary">{p.sellingPrice} DH</span>
                    <span className="text-[10px] text-muted-foreground">Stock: {p.currentStock} {p.unit}</span>
                  </Button>
                ))}
                {filteredProducts.length === 0 && (
                  <div className="col-span-full text-center text-sm text-muted-foreground py-8">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    Aucun produit disponible à la vente.
                  </div>
                )}
              </>
            ) : (
              <>
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
                  <div className="col-span-full text-center text-sm text-muted-foreground py-8">
                    Aucune prestation trouvée dans cette catégorie.
                  </div>
                )}
              </>
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
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {line.productId ? (
                      <Package className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <Scissors className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    )}
                    <p className="font-medium truncate text-sm flex-1">{line.label}</p>
                  </div>
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
