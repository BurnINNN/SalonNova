import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)
const prisma = new PrismaClient()

async function main() {
  console.log('1. Création du compte Supabase Auth...')
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: 'mehdielebbar7@gmail.com',
    password: 'Mehdi.mehdi@1',
  })

  if (authError) {
    console.error('❌ Erreur Supabase Auth:', authError.message)
    return
  }

  const userId = authData.user?.id
  if (!userId) {
    console.error('❌ Aucun ID utilisateur retourné.')
    return
  }
  
  console.log('✅ Compte créé avec ID:', userId)

  console.log("2. Création du salon et de l'employé dans Prisma...")
  
  // Vérifie si le salon existe déjà
  let salon = await prisma.salon.findUnique({ where: { slug: 'salon-pro' } })
  if (!salon) {
    salon = await prisma.salon.create({
      data: {
        name: 'Salon Pro',
        slug: 'salon-pro',
        settings: {},
      }
    })
    console.log('✅ Salon créé')
  }

  // Vérifie si l'employé existe déjà
  let employee = await prisma.employee.findUnique({ where: { email: 'mehdielebbar7@gmail.com' } })
  if (!employee) {
    employee = await prisma.employee.create({
      data: {
        name: 'Mehdi',
        email: 'mehdielebbar7@gmail.com',
        role: 'MANAGER',
        userId: userId,
        salonId: salon.id,
      }
    })
    console.log('✅ Employé créé et lié au compte Supabase')
  }

  console.log('🎉 Succès ! Le compte et le salon sont prêts.')
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })
