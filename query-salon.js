const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const salons = await prisma.salon.findMany();
  console.log("Salons:", salons);
}
main().finally(() => prisma.$disconnect());
