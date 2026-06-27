'use client'

import { useState } from 'react'
import { Printer, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { getMonthlyAnalytics } from '@/actions/analytics'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export function PrintBilanButton({ salonId }: { salonId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [selectedMonths, setSelectedMonths] = useState<string[]>([])
  const [printing, setPrinting] = useState(false)

  const handleOpen = async (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen && data.length === 0) {
      setLoading(true)
      const res = await getMonthlyAnalytics(salonId, 6)
      setData(res)
      setSelectedMonths(res.map(r => r.month))
      setLoading(false)
    }
  }

  const toggleMonth = (month: string) => {
    setSelectedMonths(prev => 
      prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
    )
  }

  const handlePrint = () => {
    setPrinting(true)
    setTimeout(() => {
      window.print()
      setPrinting(false)
      setOpen(false)
    }, 500) // allow DOM to render print view
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogTrigger render={<Button variant="secondary" className="gap-2" />}>
          <Printer className="w-4 h-4" /> Imprimer le Bilan
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Impression du bilan (6 derniers mois)</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">Sélectionnez les mois à inclure dans l'impression du bilan :</p>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {data.map(item => (
                  <div key={item.month} className="flex items-center space-x-3 p-3 rounded-xl border bg-muted/20">
                    <Checkbox 
                      id={`cb-${item.month}`} 
                      checked={selectedMonths.includes(item.month)}
                      onCheckedChange={() => toggleMonth(item.month)}
                    />
                    <label htmlFor={`cb-${item.month}`} className="flex-1 font-medium capitalize cursor-pointer">
                      {format(new Date(item.month), 'MMMM yyyy', { locale: fr })}
                    </label>
                    <span className="font-bold">{item.data.ca.toFixed(0)} MAD</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handlePrint} disabled={selectedMonths.length === 0} className="gap-2">
                  <Printer className="w-4 h-4" /> Générer PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Vue d'impression cachée à l'écran, visible seulement au print */}
      {printing && (
        <div id="multi-month-print-view" className="hidden print:block absolute top-0 left-0 w-full bg-white text-black p-8 z-50 min-h-screen">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              body * { visibility: hidden !important; }
              #multi-month-print-view, #multi-month-print-view * { visibility: visible !important; }
              #multi-month-print-view { position: absolute; left: 0; top: 0; width: 100%; }
              .page-break { page-break-after: always; }
            }
          `}} />
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold uppercase tracking-wider">Bilan Financier</h1>
            <p className="text-lg text-slate-500">Synthèse des mois sélectionnés</p>
          </div>

          {data.filter(d => selectedMonths.includes(d.month)).map((item, index) => (
            <div key={item.month} className="mb-12 page-break">
              <h2 className="text-2xl font-bold border-b-2 border-black pb-2 mb-6 capitalize">
                {format(new Date(item.month), 'MMMM yyyy', { locale: fr })}
              </h2>
              
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="font-bold text-lg mb-2">Synthèse Globale</h3>
                  <table className="w-full text-left">
                    <tbody>
                      <tr className="border-b"><td className="py-2">Chiffre d'Affaires</td><td className="text-right font-bold">{item.data.ca.toFixed(0)} MAD</td></tr>
                      <tr className="border-b"><td className="py-2">Charges Directes (Stock)</td><td className="text-right font-bold text-red-600">-{item.data.directCharges.toFixed(0)} MAD</td></tr>
                      <tr className="border-b"><td className="py-2">Charges Indirectes</td><td className="text-right font-bold text-red-600">-{item.data.indirectCharges.toFixed(0)} MAD</td></tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">Récapitulatif Activité</h3>
                  <table className="w-full text-left">
                    <tbody>
                      <tr className="border-b"><td className="py-2">Prestations réalisées</td><td className="text-right font-bold">{item.data.appointmentsCount}</td></tr>
                      <tr className="border-b"><td className="py-2">Salaires fixes</td><td className="text-right font-bold">{item.data.totalSalaries.toFixed(0)} MAD</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {item.data.indirectsList.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg mb-2 mt-4">Détail des Charges</h3>
                  <table className="w-full text-left border-collapse border border-slate-300 text-sm">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-300 p-2">Date</th>
                        <th className="border border-slate-300 p-2">Description</th>
                        <th className="border border-slate-300 p-2 text-right">Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.data.indirectsList.map((charge: any) => (
                        <tr key={charge.id}>
                          <td className="border border-slate-300 p-2">{format(new Date(charge.date), 'dd/MM/yyyy')}</td>
                          <td className="border border-slate-300 p-2">{charge.name} {charge.description ? `(${charge.description})` : ''}</td>
                          <td className="border border-slate-300 p-2 text-right">{charge.amount.toFixed(0)} MAD</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
