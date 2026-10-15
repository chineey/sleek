const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Checking comics in database...');

  const count = await prisma.article.count({
    where: {
      category: {
        in: ['Comics', 'comics'],
      },
    },
  });

  if (count > 0) {
    console.log(`Comics already exist (${count}). Skipping.`);
    return;
  }

  const lastArticle = await prisma.article.findFirst({
    orderBy: { order: 'desc' },
  });
  let nextOrder = lastArticle ? lastArticle.order + 1 : 0;

  // Comic 1
  const c1 = await prisma.article.create({
    data: {
      title: 'CHRONICLES OF ODYSSEY: CHAPTER 01',
      category: 'Comics',
      author: 'Illustrated by Kenzy & Sasha',
      date: 'Published October 2026',
      image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1200&auto=format&fit=crop',
      content: JSON.stringify({
        synopsis: 'A visual noir narrative set in futuristic Lagos. In the neon-drenched corridors of the mainland, a lone archivist uncovers the forgotten blueprints of the old city.',
        pages: [
          'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1200&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1200&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=1200&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop',
        ],
      }),
      order: nextOrder++,
    },
  });
  console.log('Created comic:', c1.title);

  // Comic 2
  const c2 = await prisma.article.create({
    data: {
      title: 'SILHOUETTES IN MONOCHROME: CHAPTER 02',
      category: 'Comics',
      author: 'Art Direction by Kennanyere',
      date: 'Published November 2026',
      image: 'https://images.unsplash.com/photo-1569701813229-33284b643e3c?q=80&w=1200&auto=format&fit=crop',
      content: JSON.stringify({
        synopsis: 'Exploring high fashion as architecture through sequential art. Shadows and sharp lines collide in a dramatic story of creation, mystery, and couture.',
        pages: [
          'https://images.unsplash.com/photo-1569701813229-33284b643e3c?q=80&w=1200&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1516726817505-f5ed825624d8?q=80&w=1200&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1200&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=1200&auto=format&fit=crop',
        ],
      }),
      order: nextOrder++,
    },
  });
  console.log('Created comic:', c2.title);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
