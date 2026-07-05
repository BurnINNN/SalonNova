'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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
    document.body.classList.add('printing-multi-month')
    setTimeout(() => {
      window.print()
      document.body.classList.remove('printing-multi-month')
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

      {/* Vue d'impression cachée à l'écran, visible seulement au print via React Portal */}
      {mounted && printing && createPortal(
        <div id="multi-month-print-view-portal" className="hidden print:block bg-white text-black p-8 min-h-screen font-sans">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              body.printing-multi-month > :not(#multi-month-print-view-portal) {
                display: none !important;
              }
              body.printing-multi-month {
                background: white !important;
                color: black !important;
              }
              #multi-month-print-view-portal, #multi-month-print-view-portal * {
                visibility: visible !important;
              }
              #multi-month-print-view-portal {
                display: block !important;
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }
              .page-break {
                break-after: page;
                page-break-after: always;
              }
              .page-break:last-child {
                break-after: auto;
                page-break-after: auto;
              }
            }
          `}} />
          
          <div className="border-b-4 border-slate-900 pb-4 mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-extrabold tracking-wider text-slate-900">SALON PRO</h1>
              <p className="text-sm text-slate-500 uppercase tracking-widest font-semibold mt-1">Bilan Financier & Performance</p>
            </div>
            <div className="text-right text-xs text-slate-400">
              <p>Document officiel de gestion</p>
              <p>Généré le {format(new Date(), 'dd/MM/yyyy à HH:mm')}</p>
            </div>
          </div>

          {data.filter(d => selectedMonths.includes(d.month)).map((item, index) => {
            const totalCharges = item.data.directCharges + item.data.indirectCharges + item.data.totalSalaries;
            const netMargin = item.data.ca - totalCharges;
            const hasCharges = item.data.indirectsList.length > 0;

            return (
              <div key={item.month} className="page-break pt-4 pb-8">
                <div className="flex justify-between items-center border-b-2 border-slate-300 pb-3 mb-6">
                  <h2 className="text-2xl font-bold uppercase tracking-tight text-slate-800 capitalize">
                    {format(new Date(item.month), 'MMMM yyyy', { locale: fr })}
                  </h2>
                  <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
                    Rapport Mensuel
                  </span>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Chiffre d'Affaires</span>
                    <span className="text-2xl font-bold text-slate-900">{item.data.ca.toLocaleString('fr-FR')} MAD</span>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Charges Globales</span>
                    <span className="text-2xl font-bold text-red-600">-{totalCharges.toLocaleString('fr-FR')} MAD</span>
                  </div>
                  <div className={`p-4 rounded-xl border ${netMargin >= 0 ? 'border-emerald-200 bg-emerald-50/20 text-emerald-800' : 'border-red-200 bg-red-50/20 text-red-800'}`}>
                    <span className="text-xs font-semibold uppercase tracking-wider block mb-1">Marge Nette</span>
                    <span className="text-2xl font-bold">
                      {netMargin >= 0 ? '+' : ''}{netMargin.toLocaleString('fr-FR')} MAD
                    </span>
                  </div>
                </div>

                {/* Summary Section */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                    <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-3">Activité du Salon</h3>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b border-slate-100">
                          <td className="py-2.5 text-slate-600">Prestations réalisées</td>
                          <td className="text-right font-bold text-slate-800">{item.data.appointmentsCount} rdv</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="py-2.5 text-slate-600">Panier moyen prestation</td>
                          <td className="text-right font-bold text-slate-800">
                            {(item.data.appointmentsCount > 0 ? (item.data.ca / item.data.appointmentsCount) : 0).toFixed(0)} MAD
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-3">Répartition des Charges</h3>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b border-slate-100">
                          <td className="py-2.5 text-slate-600">Consommation Stock (Directe)</td>
                          <td className="text-right font-semibold text-slate-800">{item.data.directCharges.toLocaleString('fr-FR')} MAD</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="py-2.5 text-slate-600">Salaires Fixes</td>
                          <td className="text-right font-semibold text-slate-800">{item.data.totalSalaries.toLocaleString('fr-FR')} MAD</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="py-2.5 text-slate-600">Charges Indirectes (Frais)</td>
                          <td className="text-right font-semibold text-slate-800">{item.data.indirectCharges.toLocaleString('fr-FR')} MAD</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Indirect charges details */}
                {hasCharges && (
                  <div className="mt-8">
                    <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-3">Détail des Charges Indirectes</h3>
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600 border-b border-slate-300">
                          <th className="p-2.5 font-bold uppercase tracking-wider">Date</th>
                          <th className="p-2.5 font-bold uppercase tracking-wider">Nom</th>
                          <th className="p-2.5 font-bold uppercase tracking-wider">Description</th>
                          <th className="p-2.5 font-bold uppercase tracking-wider">Paiement</th>
                          <th className="p-2.5 font-bold uppercase tracking-wider text-right">Montant</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {item.data.indirectsList.map((charge: any) => (
                          <tr key={charge.id} className="hover:bg-slate-50">
                            <td className="p-2.5 text-slate-500">{format(new Date(charge.date), 'dd/MM/yyyy')}</td>
                            <td className="p-2.5 font-semibold text-slate-800">{charge.name}</td>
                            <td className="p-2.5 text-slate-500">{charge.description || '-'}</td>
                            <td className="p-2.5 text-slate-500">
                              {charge.paymentMethod === 'CASH' ? 'Espèces' : charge.paymentMethod === 'CARD' ? 'Carte/Banque' : '-'}
                            </td>
                            <td className="p-2.5 text-right font-bold text-slate-800">{charge.amount.toLocaleString('fr-FR')} MAD</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>,
        document.body
      )}
    </>
  )
}
