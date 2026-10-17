import prisma from '../../../lib/prisma';
import { cookies } from 'next/headers';
import { verifySubscriberToken } from '../../../lib/subscriberToken';
import { notFound } from 'next/navigation';
import ArticleClient from './ArticleClient';

export const revalidate = 60;

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

export async function generateMetadata({ params }) {
  const articleId = parseInt(params.id, 10);
  if (isNaN(articleId)) {
    return { title: 'Story Not Found | SLEEK' };
  }

  const article = await prisma.article.findUnique({
    where: { id: articleId },
  });

  if (!article) {
    return { title: 'Story Not Found | SLEEK' };
  }

  const cleanExcerpt = article.content
    ? article.content.replace(/<\/?[^>]+(>|$)/g, '').substring(0, 160) + '...'
    : 'Read the full story on Sleek Magazine.';

  return {
    title: `${article.title} | SLEEK Magazine`,
    description: cleanExcerpt,
    openGraph: {
      title: article.title,
      description: cleanExcerpt,
      type: 'article',
      url: `/article/${article.id}`,
      siteName: 'SLEEK Magazine',
      images: article.image
        ? [
            {
              url: article.image,
              width: 1200,
              height: 900,
              alt: article.title,
            },
          ]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: cleanExcerpt,
      images: article.image ? [article.image] : [],
    },
  };
}

export default async function ArticlePage({ params }) {
  const articleId = parseInt(params.id, 10);
  if (isNaN(articleId)) {
    notFound();
  }

  const article = await prisma.article.findUnique({
    where: { id: articleId },
  });

  if (!article) {
    notFound();
  }

  const isSubscriber = await getIsSubscriber();
  const FREE_CATEGORIES = ['fashion', 'culture', 'businessnews', 'sports', 'events', 'event', 'sleekpeak'];
  const normCat = article.category?.toLowerCase().replace(/\s+/g, '') || '';
  const isFree = FREE_CATEGORIES.includes(normCat);
  const isPaywalled = !isSubscriber && !isFree;

  const articleData = {
    ...article,
    content: isPaywalled && article.content
      ? article.content.substring(0, Math.min(300, article.content.length)) + '...'
      : article.content,
    isPaywalled,
  };

  return (
    <ArticleClient
      article={articleData}
      isSubscriber={isSubscriber}
    />
  );
}
