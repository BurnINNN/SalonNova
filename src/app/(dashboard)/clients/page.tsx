import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { ClientList } from '@/components/clients/ClientList'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let clients: any[] = []
  let salonId = ''

  if (user) {
    const employee = await prisma.employee.findUnique({ where: { userId: user.id } })
    if (employee) {
      salonId = employee.salonId
      clients = await prisma.client.findMany({
        where: {
          salonId: employee.salonId,
          ...(searchParams.q && {
            OR: [
              { firstName: { contains: searchParams.q, mode: 'insensitive' as const } },
              { lastName: { contains: searchParams.q, mode: 'insensitive' as const } },
              { phone: { contains: searchParams.q } },
            ],
          }),
        },
        include: {
          _count: { select: { appointments: true } },
          hairProfile: { select: { colorFormula: true, hairType: true } },
        },
        orderBy: { lastName: 'asc' },
      })
    }
  }

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Clients ({clients.length})
        </h1>
      </div>
      <ClientList clients={clients} salonId={salonId} />
    </div>
  )
}
