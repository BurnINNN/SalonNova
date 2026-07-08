const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const categoriesData = [
  { name: 'COIFFURE', color: '#b45309', order: 1 },
  { name: 'COLORATION', color: '#be123c', order: 2 },
  { name: 'SOINS DE CHEVEUX', color: '#047857', order: 3 },
  { name: 'MANUCURE & ONGLERIE', color: '#db2777', order: 4 },
  { name: 'PÉDICURE', color: '#06b6d4', order: 5 },
  { name: 'PÉDICURE MÉDICALE', color: '#4f46e5', order: 6 },
];

const categoriesColors = {
  'COIFFURE': '#b45309',
  'COLORATION': '#be123c',
  'SOINS DE CHEVEUX': '#047857',
  'MANUCURE & ONGLERIE': '#db2777',
  'PÉDICURE': '#06b6d4',
  'PÉDICURE MÉDICALE': '#4f46e5',
};

const servicesData = [
  // COIFFURE
  { categoryName: 'COIFFURE', name: 'Brushing', price: 50, duration: 45 },
  { categoryName: 'COIFFURE', name: 'SHP+ Masque+ Brushing', price: 70, duration: 60 },
  { categoryName: 'COIFFURE', name: 'SHP spécifique+Masque traitant+ Brush', price: 100, duration: 60 },
  { categoryName: 'COIFFURE', name: 'Wavy', price: 100, duration: 45 },
  { categoryName: 'COIFFURE', name: 'Wavy + SHP+ Masque', price: 120, duration: 60 },
  { categoryName: 'COIFFURE', name: 'Coupe correction et pointes', price: 140, duration: 45 },
  { categoryName: 'COIFFURE', name: 'Coupe transformation', price: 250, duration: 60 },
  { categoryName: 'COIFFURE', name: 'Coupe enfant', price: 100, duration: 30 },
  { categoryName: 'COIFFURE', name: 'Consultation et diagnostique*', price: 200, duration: 30, description: 'à déduire de toutes prestations techniques' },
  { categoryName: 'COIFFURE', name: 'Diagnostique et mèche test*', price: 300, duration: 60, description: 'à déduire de toutes prestations techniques' },

  // COLORATION
  { categoryName: 'COLORATION', name: 'Coloration', price: 350, duration: 90 },
  { categoryName: 'COLORATION', name: 'Coloration sans ammoniaque', price: 400, duration: 90 },
  { categoryName: 'COLORATION', name: 'Coloration racines', price: 250, duration: 60 },
  { categoryName: 'COLORATION', name: 'Coloration racines sans ammoniaque', price: 300, duration: 60 },
  { categoryName: 'COLORATION', name: 'Rinçage et correction de couleur', price: 300, duration: 60 },
  { categoryName: 'COLORATION', name: 'Reflets Highlight', price: 750, duration: 150 },
  { categoryName: 'COLORATION', name: 'Ombré', price: 1200, duration: 180 },
  { categoryName: 'COLORATION', name: 'Balayage', price: 1000, duration: 180 },
  { categoryName: 'COLORATION', name: 'Airtouch', price: 1500, duration: 240 },

  // SOINS DE CHEVEUX
  { categoryName: 'SOINS DE CHEVEUX', name: 'Soin ON h\'AIR', price: 250, duration: 60 },
  { categoryName: 'SOINS DE CHEVEUX', name: 'Soin a base de PLEX ou FILLER ou Thérapie', price: 350, duration: 60 },
  { categoryName: 'SOINS DE CHEVEUX', name: 'Soin COLLAGENE', price: 700, duration: 90 },
  { categoryName: 'SOINS DE CHEVEUX', name: 'Soin PROTEINE', price: 1000, duration: 120 },
  { categoryName: 'SOINS DE CHEVEUX', name: 'Soin BRUSHING permanent', price: 750, duration: 120 },
  { categoryName: 'SOINS DE CHEVEUX', name: 'Soin semi permanent CURLY hair', price: 300, duration: 120 },
  { categoryName: 'SOINS DE CHEVEUX', name: 'Soin permanent CURLY hair', price: 800, duration: 150 },

  // MANUCURE & ONGLERIE
  { categoryName: 'MANUCURE & ONGLERIE', name: 'Manucure russe classique', price: 200, duration: 45 },
  { categoryName: 'MANUCURE & ONGLERIE', name: 'Manucure russe avec vernis permanent et biab (ongles courts)', price: 400, duration: 60 },
  { categoryName: 'MANUCURE & ONGLERIE', name: 'Manucure russe avec vernis permanent et biab (longueur moyenne des ongles)', price: 450, duration: 75 },
  { categoryName: 'MANUCURE & ONGLERIE', name: 'Manucure russe avec vernis permanent et biab (ongles longs)', price: 500, duration: 90 },
  { categoryName: 'MANUCURE & ONGLERIE', name: 'Manucure russe + Extension de gel + vernis permanent et biab', price: 650, duration: 120 },
  { categoryName: 'MANUCURE & ONGLERIE', name: 'Extension de ongles', price: 50, duration: 30 },
  { categoryName: 'MANUCURE & ONGLERIE', name: 'French', price: 50, duration: 15 },
  { categoryName: 'MANUCURE & ONGLERIE', name: 'Dépose gel', price: 100, duration: 30 },
  { categoryName: 'MANUCURE & ONGLERIE', name: 'Dépose vernis pied', price: 50, duration: 20 },

  // PÉDICURE
  { categoryName: 'PÉDICURE', name: 'Pédicure Russe avec vernis permanent', price: 350, duration: 60 },
  { categoryName: 'PÉDICURE', name: 'Pédicure Russe avec vernis normal / sans vernis', price: 300, duration: 60 },
  { categoryName: 'PÉDICURE', name: 'Pédicure Russe Express avec vernis permanent', price: 300, duration: 45 },

  // PÉDICURE MÉDICALE
  { categoryName: 'PÉDICURE MÉDICALE', name: 'Pédicure Médicale pour femme', price: 500, duration: 60 },
  { categoryName: 'PÉDICURE MÉDICALE', name: 'Pédicure Médicale pour homme', price: 550, duration: 60 },
  { categoryName: 'PÉDICURE MÉDICALE', name: 'Exérèse verrues (1 séance)', price: 350, duration: 30 },
  { categoryName: 'PÉDICURE MÉDICALE', name: 'Correction de la forme des ongles avec un fil de titane (un ongle)', price: 350, duration: 45 },
];

async function main() {
  console.log('Récupération du salon OnHair...');
  const salon = await prisma.salon.findFirst({
    where: { slug: 'onhair' },
  });

  if (!salon) {
    throw new Error('Le salon avec le slug "onhair" n\'existe pas dans la base de données.');
  }

  console.log(`Salon trouvé : ${salon.name} (ID: ${salon.id})`);

  // Insertion ou mise à jour des catégories
  const categoriesMap = {};
  for (const cat of categoriesData) {
    const existingCat = await prisma.serviceCategory.findFirst({
      where: { salonId: salon.id, name: cat.name },
    });

    if (existingCat) {
      const updatedCat = await prisma.serviceCategory.update({
        where: { id: existingCat.id },
        data: {
          color: cat.color,
          order: cat.order,
        },
      });
      console.log(`Catégorie mise à jour : ${updatedCat.name}`);
      categoriesMap[cat.name] = updatedCat.id;
    } else {
      const newCat = await prisma.serviceCategory.create({
        data: {
          name: cat.name,
          color: cat.color,
          order: cat.order,
          salonId: salon.id,
        },
      });
      console.log(`Catégorie créée : ${newCat.name}`);
      categoriesMap[cat.name] = newCat.id;
    }
  }

  // Insertion ou mise à jour des prestations
  for (const serv of servicesData) {
    const categoryId = categoriesMap[serv.categoryName];
    if (!categoryId) {
      console.warn(`Attention : Pas de catégorie trouvée pour la prestation ${serv.name}`);
      continue;
    }

    const existingServ = await prisma.service.findFirst({
      where: {
        salonId: salon.id,
        name: serv.name,
        categoryId: categoryId,
      },
    });

    const catColor = categoriesColors[serv.categoryName];

    if (existingServ) {
      const updatedServ = await prisma.service.update({
        where: { id: existingServ.id },
        data: {
          price: serv.price,
          duration: serv.duration,
          description: serv.description || null,
          color: catColor,
        },
      });
      console.log(`Prestation mise à jour : ${updatedServ.name} dans ${serv.categoryName} (${updatedServ.price} MAD)`);
    } else {
      const newServ = await prisma.service.create({
        data: {
          name: serv.name,
          price: serv.price,
          duration: serv.duration,
          description: serv.description || null,
          color: catColor,
          categoryId: categoryId,
          salonId: salon.id,
        },
      });
      console.log(`Prestation créée : ${newServ.name} dans ${serv.categoryName} (${newServ.price} MAD)`);
    }
  }

  console.log('Seeding des prestations terminé avec succès !');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
