import prisma from '../lib/prisma';

export const revalidate = 3600; // Revalidate sitemap every hour

export default async function sitemap() {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://sleekmagazine.ng').replace(/\/+$/, '');
  const now = new Date();

  // Core static public routes
  const staticRoutes = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/comics`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/events`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  // Dynamic public article routes
  let dynamicArticleRoutes = [];
  try {
    const articles = await prisma.article.findMany({
      select: {
        id: true,
        createdAt: true,
      },
      orderBy: {
        id: 'desc',
      },
    });

    dynamicArticleRoutes = articles.map((article) => ({
      url: `${baseUrl}/article/${article.id}`,
      lastModified: article.createdAt ? new Date(article.createdAt) : now,
      changeFrequency: 'weekly',
      priority: 0.7,
    }));
  } catch (error) {
    console.error('Error retrieving articles for sitemap:', error);
  }

  return [...staticRoutes, ...dynamicArticleRoutes];
}
