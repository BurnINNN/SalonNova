import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create or get existing salon
  const salon = await prisma.salon.upsert({
    where: { slug: 'salon-demo' },
    update: {},
    create: {
      name: 'Salon Beauté Pro',
      slug: 'salon-demo',
      settings: {
        currency: 'MAD',
        timezone: 'Africa/Casablanca',
        llmProvider: 'anthropic',
      },
    },
  })

  console.log('Salon créé:', salon.name)


  // Produits de stock
  const colorant = await prisma.product.upsert({
    where: { id: 'product-colorant-seed' },
    update: {},
    create: {
      id: 'product-colorant-seed',
      salonId: salon.id,
      name: 'Coloration 6.0',
      brand: "L'Oréal",
      reference: 'LOR-6.0',
      category: 'COLORANT',
      unit: 'tube',
      currentStock: 10,
      minStock: 3,
      purchasePrice: 25,
    },
  })

  await prisma.product.createMany({
    skipDuplicates: true,
    data: [
      {
        salonId: salon.id,
        name: 'Oxydant 20 vol',
        brand: "L'Oréal",
        category: 'COLORANT',
        unit: 'litre',
        currentStock: 3,
        minStock: 1,
        purchasePrice: 45,
      },
      {
        salonId: salon.id,
        name: 'Shampoing professionnel',
        brand: 'Kérastase',
        category: 'SHAMPOING',
        unit: 'litre',
        currentStock: 2,
        minStock: 1,
        purchasePrice: 120,
      },
      {
        salonId: salon.id,
        name: 'Masque soin intensif',
        brand: 'Kérastase',
        category: 'SOIN',
        unit: 'pot',
        currentStock: 0,
        minStock: 1,
        purchasePrice: 180,
      },
      {
        salonId: salon.id,
        name: 'Gants latex',
        category: 'OUTIL',
        unit: 'boîte',
        currentStock: 5,
        minStock: 2,
        purchasePrice: 30,
      },
    ],
  })

  console.log('Produits créés.')

  // Lier la prestation Coloration aux produits consommés
  const colorationService = await prisma.service.findFirst({
    where: { salonId: salon.id, name: 'Coloration' },
  })

  if (colorationService) {
    await prisma.serviceProduct.createMany({
      skipDuplicates: true,
      data: [
        { serviceId: colorationService.id, productId: colorant.id, quantity: 2 },
      ],
    })
    console.log('Lien prestation-produit créé.')
  }

  console.log('Seed stock terminé.')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
