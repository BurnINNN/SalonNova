import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const result = await prisma.$executeRawUnsafe(
    `UPDATE auth.users SET email_confirmed_at = now() WHERE email = 'mehdielebbar7@gmail.com'`
  )
  console.log(`Updated ${result} user(s). Email is now confirmed.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
