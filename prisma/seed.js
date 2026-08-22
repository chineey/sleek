const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Clean existing records
  await prisma.article.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Create default Admin user
  const hashedPassword = await bcrypt.hash('adminsecurepassword', 10);
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      password: hashedPassword,
    },
  });
  console.log('Admin user created:', admin.username);

  // 3. Create mock articles
  const articles = [
    {
      title: "A New Wave: Shadows and Leather",
      category: "Editorial",
      author: "Written by K. Harrison",
      date: "Published August 2026",
      image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=800&auto=format&fit=crop",
      order: 0,
      content: `
        <p>The convergence of shape, silhouette, and shadow represents the core of contemporary dark minimalism. In our introductory essay for Ish. 01, we deconstruct the modern language of street couture—drawing heavily on raw leather surfaces, heavy drapery, and high-contrast environments that frame the body as a sculpture rather than a mere hanger.</p>
        <p>For decades, fashion has fluctuated between excessive statement pieces and sterile simplicity. The 'New Wave' movement, however, strikes a balance by finding expression in texture rather than color. Under the lens of shadows, leather captures light in a unique dimensional gradient, radiating both defiance and classical restraint.</p>
        <blockquote class="reader-quote">"True elegance is not about standing out, but about remaining unforgettable in your quietest posture."</blockquote>
        <p>Brutalist architecture serves as our primary canvas. The cold, unyielding lines of concrete create a sharp tension with the organic, flexible nature of leather garments. As the model turns against the spotlight, shadow lines cast by window panes divide the frame, giving structure to the abstract silhouette.</p>
        <p>Ultimately, this editorial issue is an invitation to explore the depth of the dark palette. By stripping away chromatic distractions, we focus on the raw textures, the meticulous stitchings, and the heavy drapes that define the character of the modern individual.</p>
      `
    },
    {
      title: "Monochrome Silhouette",
      category: "Fashion",
      author: "Written by Elena Rostova",
      date: "Published July 2026",
      image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop",
      order: 1,
      content: `
        <p>Monochrome photography is more than just the absence of color—it is a conscious emphasis on line, shadow, and architectural design. By reducing a fashion subject to pure gray values, we uncover the hidden details of fabric weave, tailoring lines, and the structural dynamics of model poses.</p>
        <p>In this editorial profile, Elena Rostova details how high-contrast black and white styling establishes a classic, timeless narrative. We explore the history of monochromatic portraiture in vintage editorial layouts, tracing its roots from mid-century magazine prints to modern digital interfaces.</p>
        <blockquote class="reader-quote">"Black and white is the canvas of memory; it strips the surface to reveal the raw spirit underneath."</blockquote>
        <p>Using minimal styling elements—a crisp white collared shirt, an oversized wool coat, and heavy shadow structures—we present a series of imagery that speaks of volume and weight. The simplicity of the layout reinforces the strength of the visual story.</p>
      `
    },
    {
      title: "Architectural Echoes",
      category: "Culture",
      author: "Written by Marcus Aurel",
      date: "Published June 2026",
      image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800&auto=format&fit=crop",
      order: 2,
      content: `
        <p>How do our environments shape our clothing, and vice versa? 'Architectural Echoes' explores the relationship between brutalist concrete architecture and flowing editorial garments. Filmed on location at mid-century structures, the photoshoot showcases the contrasting dynamics of hard textures and delicate silks.</p>
        <p>Marcus Aurel analyzes the history of architectural fashion shoots, discussing how structures designed in the 1960s continue to serve as the ultimate backdrop for forward-looking designers. The geometric patterns, raw concrete columns, and natural shadow play of these structures match the modular concepts of modern outerwear.</p>
        <blockquote class="reader-quote">"Concrete does not bend, but silk remembers the wind. In their collision, we find a perfect, brief harmony."</blockquote>
        <p>Through detailed analysis, we see how architects and fashion designers share a common goal: structuring three-dimensional forms around the human body. This essay celebrates that overlap, outlining the future of spatial and sartorial collaboration.</p>
      `
    },
    {
      title: "Quiet Luxury & Brutalism",
      category: "Design",
      author: "Written by Silvia Vance",
      date: "Published May 2026",
      image: "https://images.unsplash.com/photo-1548624149-f9b1859aa7d0?q=80&w=800&auto=format&fit=crop",
      order: 3,
      content: `
        <p>Quiet luxury has become the defining term of the decade. But when contrasted against the harsh backdrop of brutalist architecture, its silent elegance gains an intense, unexpected edge. We take a close look at how high-grade cashmeres and structured wools behave when placed in unpolished industrial ruins.</p>
        <p>Silvia Vance discusses the shift away from loud branding toward understated fabrics. The raw, textured surfaces of industrial concrete blocks emphasize the softness of premium materials. By highlighting this friction, designers create a visual texture that feels incredibly rich and layered.</p>
        <blockquote class="reader-quote">"Subtlety is the ultimate force. In an era of constant noise, speaking in a whisper makes everyone lean in."</blockquote>
        <p>We review the key collections that embody this aesthetic, examining tailoring techniques that focus on internal structure rather than external decoration. The result is a selection of garments that look as sturdy as concrete yet feel as light as air.</p>
      `
    },
    {
      title: "Retrospective: Muted Tones",
      category: "Fashion",
      author: "Written by Julian Mercer",
      date: "Published April 2026",
      image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=800&auto=format&fit=crop",
      order: 4,
      content: `
        <p>From the sandy dunes of Saharan palettes to the deep volcanic charcoal of urban landscapes, muted tones have asserted complete dominance over the seasonal runway. This retrospective explores the psychological appeal of earthy, desaturated shades in an increasingly digital world.</p>
        <p>Julian Mercer leads a discussion on color theory, explaining why neutrals trigger a sense of calm and luxury. By using colors that blend with our organic environments, we foster a closer connection to nature, even when standing in the middle of a concrete metropolis.</p>
        <blockquote class="reader-quote">"Neutrals are not passive; they are the background harmony that allows the individual character to sing."</blockquote>
        <p>We compile a style guide on how to mix warm and cool tones, layers of linen and suede, and metallic accents like muted bronze to construct a balanced, premium daily wardrobe.</p>
      `
    }
  ];

  for (const article of articles) {
    const created = await prisma.article.create({ data: article });
    console.log('Created article:', created.title);
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
