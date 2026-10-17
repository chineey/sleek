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
      orderBy: { order: 'asc' },
    });

    const FREE_CATEGORIES = ['fashion', 'culture', 'businessnews', 'sports', 'events', 'event', 'sleekpeak'];

    return articles.map((art) => {
      const normCat = art.category?.toLowerCase().replace(/\s+/g, '') || '';
      const isSleekPeak = normCat === 'sleekpeak';
      const isComics = normCat === 'comics';
      const isFree = FREE_CATEGORIES.includes(normCat);

      if (!isSubscriber) {
        if (isFree) {
          return {
            ...art,
            content: art.content,
            isPaywalled: false,
            isSleekPeak,
            isComics,
          };
        } else if (isComics) {
          return {
            ...art,
            content: '',
            isPaywalled: true,
            isSleekPeak,
            isComics,
          };
        } else {
          const previewContent = art.content
            ? art.content.substring(0, Math.min(300, art.content.length)) + '...'
            : '';
          return {
            ...art,
            content: previewContent,
            isPaywalled: true,
            isSleekPeak,
            isComics,
          };
        }
      }

      return {
        ...art,
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

  return (
    <>
      {cover?.image && (
        <link rel="preload" as="image" href={cover.image} fetchPriority="high" />
      )}
      <HomeClient
        initialCover={cover}
        initialIsSubscriber={isSubscriber}
        initialArticles={initialArticles}
      />
    </>
  );
}
