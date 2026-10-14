const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding sample events...');

  const count = await prisma.event.count();
  if (count > 0) {
    console.log(`Events already exist (${count}). Skipping.`);
    return;
  }

  // Event 1: Upcoming Event (e.g. 7 days from now)
  const upcomingDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000);
  const ev1 = await prisma.event.create({
    data: {
      title: 'SLEEK Nightwave: Vol. 02 Launch Party',
      description: 'Join the SLEEK editorial circle, creators, and contributors for an exclusive evening of high-fashion curation, electronic soundscapes, and cocktails.\n\nDress Code: Dark Minimalism / Leather Accents.\nLineup: DJ Sasha K, Vang Collective, and guest live percussion.\nIncludes complimentary champagne on arrival for SLEEK pass holders.',
      date: upcomingDate,
      location: 'The Glasshouse Skybar',
      address: 'Plot 14B Admiralty Way, Lekki Phase 1, Lagos',
      latitude: 6.4474,
      longitude: 3.4723,
      image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1200&auto=format&fit=crop',
      active: true,
      order: 0,
    },
  });
  console.log('Created upcoming event:', ev1.title);

  // Event 2: Past Party (e.g. 5 days ago) - can be rated 1-5 stars!
  const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  const ev2 = await prisma.event.create({
    data: {
      title: 'Ish. 01 Launch & Listening Room',
      description: 'An intimate nocturnal gathering celebrating the release of SLEEK Magazine Ish. 01. Archival prints, sound installations, and designer previews.\n\nThank you to everyone who joined us for an unforgettable night! Please leave your rating (1 - 5 stars) and comments on how the night treated you.',
      date: pastDate,
      location: 'The Vault Loft & Terrace',
      address: '22 Adeola Odeku Street, Victoria Island, Lagos',
      latitude: 6.4281,
      longitude: 3.4219,
      image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1200&auto=format&fit=crop',
      active: true,
      order: 1,
    },
  });
  console.log('Created past event:', ev2.title);

  // Add initial ratings to past event
  await prisma.eventRating.createMany({
    data: [
      { eventId: ev2.id, rating: 5 },
      { eventId: ev2.id, rating: 5 },
      { eventId: ev2.id, rating: 4 },
      { eventId: ev2.id, rating: 5 },
      { eventId: ev2.id, rating: 4 },
    ],
  });
  console.log('Added initial ratings to past event.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
