import { getSalon } from '@/actions/salon'
import { getChargeCategories } from '@/actions/charges'
import { SalonSettingsForm } from '@/components/settings/SalonSettingsForm'
import { ChargeCategoryManager } from '@/components/settings/ChargeCategoryManager'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function GeneralSettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const employeeRecord = await prisma.employee.findUnique({
    where: { userId: user.id },
  })

  if (!employeeRecord) {
    return <div className="p-4 text-destructive">Aucun employé lié à votre compte.</div>
  }

  const salonId = employeeRecord.salonId
  const salon = await getSalon(salonId)
  if (!salon) {
    return (
      <div className="p-4 text-destructive">
        Veuillez d'abord créer un salon dans la base de données.
      </div>
    )
  }

  const chargeCategories = await getChargeCategories(salonId)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Général</h2>
        <p className="text-sm text-muted-foreground">
          Configurez les informations globales de votre salon.
        </p>
      </div>

      <SalonSettingsForm salon={salon} />

      <ChargeCategoryManager categories={chargeCategories} salonId={salonId} />
    </div>
  )
}
