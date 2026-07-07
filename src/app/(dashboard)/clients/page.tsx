import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { ClientList } from '@/components/clients/ClientList'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: { q?: string; sort?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let clients: any[] = []
  let salonId = ''
  const sort = searchParams.sort || 'alpha'

  if (user) {
    const employee = await prisma.employee.findUnique({ where: { userId: user.id } })
    if (employee) {
      salonId = employee.salonId

      const whereClause: any = {
        salonId: employee.salonId,
        ...(searchParams.q && {
          OR: [
            { firstName: { contains: searchParams.q, mode: 'insensitive' as const } },
            { lastName: { contains: searchParams.q, mode: 'insensitive' as const } },
            { phone: { contains: searchParams.q } },
          ],
        }),
      }

      if (sort === 'recent') {
        // Sort by last appointment date descending
        clients = await prisma.client.findMany({
          where: whereClause,
          include: {
            _count: { select: { appointments: true } },
            hairProfile: { select: { colorFormula: true, hairType: true } },
            appointments: {
              orderBy: { startTime: 'desc' },
              take: 1,
              select: { startTime: true },
            },
          },
          orderBy: { updatedAt: 'desc' },
        })
        // Sort by the last appointment date
        clients.sort((a, b) => {
          const aDate = a.appointments[0]?.startTime?.getTime() || 0
          const bDate = b.appointments[0]?.startTime?.getTime() || 0
          return bDate - aDate
        })
      } else if (sort === 'fidelite') {
        // Sort by appointment count descending
        clients = await prisma.client.findMany({
          where: whereClause,
          include: {
            _count: { select: { appointments: true } },
            hairProfile: { select: { colorFormula: true, hairType: true } },
          },
          orderBy: { appointments: { _count: 'desc' } },
        })
      } else if (sort === 'noshows') {
        // Sort by no-show count descending
        clients = await prisma.client.findMany({
          where: whereClause,
          include: {
            _count: { 
              select: { 
                appointments: true,
              } 
            },
            hairProfile: { select: { colorFormula: true, hairType: true } },
            appointments: {
              where: { status: 'NO_SHOW' },
              select: { id: true },
            },
          },
          orderBy: { lastName: 'asc' },
        })
        // Sort by no-show count descending
        clients.sort((a, b) => (b.appointments?.length || 0) - (a.appointments?.length || 0))
        // Remap _count and add noShowCount for display
        clients = clients.map(c => ({
          ...c,
          noShowCount: c.appointments?.length || 0,
          appointments: undefined,
        }))
      } else {
        // Default: alphabetical
        clients = await prisma.client.findMany({
          where: whereClause,
          include: {
            _count: { select: { appointments: true } },
            hairProfile: { select: { colorFormula: true, hairType: true } },
          },
          orderBy: { lastName: 'asc' },
        })
      }
    }
  }

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Clients ({clients.length})
        </h1>
      </div>
      <ClientList clients={clients} salonId={salonId} currentSort={sort} />
    </div>
  )
}

