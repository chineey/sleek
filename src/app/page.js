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

export default async function Home() {
  // Fetch both in parallel — no waterfall
  const [cover, isSubscriber] = await Promise.all([getCover(), getIsSubscriber()]);

  return (
    <>
      {cover?.image && (
        <link rel="preload" as="image" href={cover.image} fetchPriority="high" />
      )}
      <HomeClient initialCover={cover} initialIsSubscriber={isSubscriber} />
    </>
  );
}
