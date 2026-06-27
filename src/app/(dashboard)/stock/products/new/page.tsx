import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { ProductForm } from '@/components/stock/ProductForm'

export default async function NewProductPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const employee = await prisma.employee.findUnique({ where: { userId: user.id } })
  if (!employee) return null

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
        Nouveau produit
      </h1>
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <ProductForm salonId={employee.salonId} />
      </div>
    </div>
  )
}
