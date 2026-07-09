import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { getProductWithMovements } from '@/actions/stock'
import { ProductForm } from '@/components/stock/ProductForm'
import { MovementForm } from '@/components/stock/MovementForm'
import { notFound } from 'next/navigation'

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const employee = await prisma.employee.findUnique({ where: { userId: user.id } })
  if (!employee) return null

  const product = await getProductWithMovements(params.id, employee.salonId)
  if (!product) notFound()

  return (
    <div className="p-6 max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          Gérer : {product.name}
        </h1>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <ProductForm
            salonId={employee.salonId}
            initialData={{
              ...product,
              sellingPrice: product.sellingPrice ?? undefined,
              brand: product.brand ?? undefined,
              reference: product.reference ?? undefined,
              description: product.description ?? undefined,
            } as any}
          />
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 font-semibold border-b border-slate-200 dark:border-slate-800">
            Historique des mouvements
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Date</th>
                <th className="text-left px-4 py-2 font-medium">Type</th>
                <th className="text-right px-4 py-2 font-medium">Qté</th>
                <th className="text-left px-4 py-2 font-medium">Motif</th>
              </tr>
            </thead>
            <tbody>
              {product.stockMovements.map(m => (
                <tr key={m.id} className="border-t border-slate-100 dark:border-slate-800/60">
                  <td className="px-4 py-2 text-slate-500">
                    {m.createdAt.toLocaleDateString('fr-MA', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                  <td className="px-4 py-2 font-medium">
                    <span className={`px-2 py-0.5 rounded text-xs
                      ${m.type === 'ENTREE' ? 'bg-green-100 text-green-700' :
                        m.type === 'SORTIE' ? 'bg-red-100 text-red-700' :
                        m.type === 'INVENTAIRE' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'}`}>
                      {m.type}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-medium">
                    {m.type === 'ENTREE' ? '+' : ''}{m.quantity}
                  </td>
                  <td className="px-4 py-2 text-slate-500">
                    {m.reason || (m.appointment ? `Rendez-vous: ${m.appointment.service.name}` : '-')}
                  </td>
                </tr>
              ))}
              {product.stockMovements.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-center text-slate-500">
                    Aucun mouvement enregistré.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-6 bg-slate-50 dark:bg-slate-800/20">
          <h2 className="text-lg font-semibold mb-4">Nouveau mouvement</h2>
          <MovementForm
            productId={product.id}
            salonId={employee.salonId}
            unit={product.unit}
            currentStock={product.currentStock}
          />
        </div>
      </div>
    </div>
  )
}
