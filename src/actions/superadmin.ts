'use server'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const SUPERADMIN_EMAIL = 'mehdielebbar7@gmail.com'

// Helper to check superadmin authorization
async function verifySuperadmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== SUPERADMIN_EMAIL) {
    throw new Error('Non autorisé : Réservé au Super Admin')
  }
  return user
}

// 1. Switch the active salon for the superadmin
export async function switchSuperadminSalon(salonId: string) {
  try {
    const user = await verifySuperadmin()

    // Verify the salon exists
    const salon = await prisma.salon.findUnique({ where: { id: salonId } })
    if (!salon) {
      return { success: false, error: 'Salon introuvable' }
    }

    // Rechercher l'employé superadmin existant par userId ou email
    const employee = await prisma.employee.findFirst({
      where: {
        OR: [
          { userId: user.id },
          { email: SUPERADMIN_EMAIL }
        ]
      }
    })

    if (employee) {
      // Mettre à jour l'employé existant
      await prisma.employee.update({
        where: { id: employee.id },
        data: { 
          salonId,
          userId: user.id,
          email: SUPERADMIN_EMAIL
        },
      })
    } else {
      // Créer l'employé superadmin s'il n'existe pas
      await prisma.employee.create({
        data: {
          name: 'Super Admin',
          email: SUPERADMIN_EMAIL,
          role: 'MANAGER',
          userId: user.id,
          salonId: salonId
        }
      })
    }

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error: any) {
    console.error('Failed to switch superadmin salon:', error)
    return { success: false, error: error.message || 'Erreur lors du changement de salon' }
  }
}

// Validation schemas
const CreateAccountSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit faire au moins 6 caractères'),
  role: z.enum(['MANAGER', 'HAIRDRESSER']),
  salonId: z.string().min(1, 'Le salon est obligatoire'),
  phone: z.string().optional().nullable(),
})

const UpdateAccountSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  role: z.enum(['MANAGER', 'HAIRDRESSER']),
  salonId: z.string().min(1, 'Le salon est obligatoire'),
  phone: z.string().optional().nullable(),
})

const CreateSalonSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  slug: z.string().min(2, 'Le slug doit contenir au moins 2 caractères')
    .regex(/^[a-z0-9-]+$/, 'Le slug doit contenir uniquement des lettres minuscules, chiffres et tirets'),
})

// 2. Create account (Supabase Auth + Prisma Employee)
export async function createAccountAction(input: z.infer<typeof CreateAccountSchema>) {
  try {
    await verifySuperadmin()
    const data = CreateAccountSchema.parse(input)

    // Check if employee email is already registered in Prisma
    const existingEmployee = await prisma.employee.findUnique({
      where: { email: data.email },
    })
    if (existingEmployee) {
      return { success: false, error: 'Cet email est déjà utilisé par un employé existant.' }
    }

    // Create client for Supabase Auth interaction
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey)

    // Sign up the new user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })

    if (authError) {
      return { success: false, error: `Erreur d'authentification Supabase: ${authError.message}` }
    }

    const userId = authData.user?.id
    if (!userId) {
      return { success: false, error: 'Aucun identifiant utilisateur retourné par Supabase' }
    }

    // Confirm email directly via raw SQL to bypass confirmation email flow
    await prisma.$executeRawUnsafe(
      `UPDATE auth.users SET email_confirmed_at = now() WHERE id = $1::uuid`,
      userId
    )

    // Create the Employee record
    const employee = await prisma.employee.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        userId: userId,
        salonId: data.salonId,
      },
    })

    revalidatePath('/superadmin')
    return { success: true, employee }
  } catch (error: any) {
    console.error('Failed to create account:', error)
    return { success: false, error: error.message || 'Erreur lors de la création du compte' }
  }
}

// 3. Update account (Prisma Employee)
export async function updateAccountAction(employeeId: string, input: z.infer<typeof UpdateAccountSchema>) {
  try {
    await verifySuperadmin()
    const data = UpdateAccountSchema.parse(input)

    // Update Employee record
    const employee = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        name: data.name,
        role: data.role,
        salonId: data.salonId,
        phone: data.phone,
      },
    })

    revalidatePath('/superadmin')
    return { success: true, employee }
  } catch (error: any) {
    console.error('Failed to update account:', error)
    return { success: false, error: error.message || 'Erreur lors de la modification du compte' }
  }
}

// 4. Delete Employee and Supabase User
export async function deleteEmployeeAction(employeeId: string) {
  try {
    await verifySuperadmin()

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    })

    if (!employee) {
      return { success: false, error: 'Employé introuvable' }
    }

    if (employee.email === SUPERADMIN_EMAIL) {
      return { success: false, error: 'Impossible de supprimer le compte Super Admin principal.' }
    }

    // Delete from Prisma first
    await prisma.employee.delete({
      where: { id: employeeId },
    })

    // If there is an associated Supabase Auth user, delete it directly from the database
    if (employee.userId) {
      await prisma.$executeRawUnsafe(
        `DELETE FROM auth.users WHERE id = $1::uuid`,
        employee.userId
      )
    }

    revalidatePath('/superadmin')
    return { success: true }
  } catch (error: any) {
    console.error('Failed to delete employee:', error)
    return { success: false, error: error.message || 'Erreur lors de la suppression' }
  }
}

// 5. Create new salon
export async function createSalonAction(input: z.infer<typeof CreateSalonSchema>) {
  try {
    await verifySuperadmin()
    const data = CreateSalonSchema.parse(input)

    // Check if slug is unique
    const existingSalon = await prisma.salon.findUnique({
      where: { slug: data.slug },
    })
    if (existingSalon) {
      return { success: false, error: 'Un salon avec ce slug existe déjà.' }
    }

    // Create the salon
    const salon = await prisma.salon.create({
      data: {
        name: data.name,
        slug: data.slug,
        settings: {},
      },
    })

    revalidatePath('/superadmin')
    return { success: true, salon }
  } catch (error: any) {
    console.error('Failed to create salon:', error)
    return { success: false, error: error.message || 'Erreur lors de la création du salon' }
  }
}
