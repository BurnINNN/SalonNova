import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { getServices } from '@/actions/services'
import { getServiceCategories } from '@/actions/serviceCategories'
import { ServiceList } from '@/components/settings/ServiceList'

export default async function ServicesSettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let services: any[] = []
  let salonId = ''

  let categories: any[] = []

  if (user) {
    const employee = await prisma.employee.findUnique({ where: { userId: user.id } })
    if (employee) {
      salonId = employee.salonId
      services = await getServices(salonId)
      categories = await getServiceCategories(salonId)
    }
  }

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Catalogue des prestations
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez les services proposés dans votre salon, leurs prix et leurs durées.
          </p>
        </div>
      </div>
      
      <ServiceList initialServices={services} categories={categories} salonId={salonId} />
    </div>
  )
}
