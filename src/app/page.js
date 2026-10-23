import { cookies } from 'next/headers';
import prisma from '../lib/prisma';
import { verifySubscriberToken } from '../lib/subscriberToken';
import HomeClient from '../components/HomeClient';

// ISR: revalidate every 60 seconds so cover changes propagate quickly
export const revalidate = 60;

const DEFAULT_COVER = {
  title: 'SLEEK',
  issue: 'ISH. 01',
  label: 'MAGAZINE',
  tagline: 'A New WAVE',
  url: 'www.sleekmagazine.com',
  social: '@sleekpeak',
  image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1200&auto=format&fit=crop',
  editorialImage: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=800&auto=format&fit=crop',
};

async function getCover() {
  try {
    const settings = await prisma.coverSettings.findUnique({ where: { id: 1 } });
    return settings || DEFAULT_COVER;
  } catch {
    return DEFAULT_COVER;
  }
}

async function getIsSubscriber() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('subscriber_token')?.value;
    if (!token) return false;

    const payload = verifySubscriberToken(token);
    if (!payload?.email) return false;

    const subscriber = await prisma.subscriber.findUnique({
      where: { email: payload.email },
      select: { status: true, expiresAt: true },
    });

    if (!subscriber || subscriber.status !== 'active') return false;
    if (subscriber.expiresAt && new Date() > subscriber.expiresAt) return false;

    return true;
  } catch {
    return false;
  }
}

async function getInitialArticles(isSubscriber) {
  try {
    const articles = await prisma.article.findMany({
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    const FREE_CATEGORIES = ['fashion', 'culture', 'businessnews', 'sports', 'events', 'event', 'sleekpeak'];

    return articles.map((art) => {
      const normCat = art.category?.toLowerCase().replace(/\s+/g, '') || '';
      const isSleekPeak = normCat === 'sleekpeak';
      const isComics = normCat === 'comics' || normCat === 'comic';
      const isFree = FREE_CATEGORIES.includes(normCat);
      const createdAtStr = art.createdAt instanceof Date ? art.createdAt.toISOString() : (art.createdAt || null);

      if (!isSubscriber) {
        if (isFree) {
          return {
            ...art,
            createdAt: createdAtStr,
            content: art.content,
            isPaywalled: false,
            isSleekPeak,
            isComics,
          };
        } else {
          const previewContent = art.content
            ? art.content.substring(0, Math.min(300, art.content.length)) + '...'
            : '';
          return {
            ...art,
            createdAt: createdAtStr,
            content: previewContent,
            isPaywalled: true,
            isSleekPeak,
            isComics,
          };
        }
      }

      return {
        ...art,
        createdAt: createdAtStr,
        isPaywalled: false,
        isSleekPeak,
        isComics,
      };
    });
  } catch (err) {
    console.error('Failed to pre-fetch articles:', err);
    return [];
  }
}

export default async function Home() {
  const isSubscriber = await getIsSubscriber();
  // Fetch cover and articles in parallel on the server — eliminating client-side waterfall
  const [cover, initialArticles] = await Promise.all([
    getCover(),
    getInitialArticles(isSubscriber),
  ]);

  // Determine category of the most recently uploaded article so the site loads directly on it
  let initialCategory = 'fashion';
  if (initialArticles && initialArticles.length > 0) {
    const sortedByRecent = [...initialArticles].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      return (b.id || 0) - (a.id || 0);
    });
    const mostRecent = sortedByRecent[0];
    const norm = mostRecent.category?.toLowerCase().replace(/\s+/g, '') || '';
    const CATEGORY_MAP = {
      fashion: 'fashion',
      sports: 'sports',
      sleekpeak: 'sleekpeak',
      culture: 'culture',
      editorial: 'editorial',
      businessnews: 'business news',
      business: 'business news',
      comics: 'comics',
      comic: 'comics',
      event: 'event',
      events: 'event',
    };
    initialCategory = CATEGORY_MAP[norm] || norm || 'fashion';
  }

  return (
    <>
      {cover?.image && (
        <link rel="preload" as="image" href={cover.image} fetchPriority="high" />
      )}
      <HomeClient
        initialCover={cover}
        initialIsSubscriber={isSubscriber}
        initialArticles={initialArticles}
        initialCategory={initialCategory}
      />
    </>
  );
}
