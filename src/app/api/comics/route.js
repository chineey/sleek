import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import prisma from '../../../lib/prisma';
import { verifySubscriberToken } from '../../../lib/subscriberToken';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    let isSubscriber = false;

    if (session) {
      isSubscriber = true;
    } else {
      const token = req.cookies.get('subscriber_token')?.value;
      if (token) {
        const payload = verifySubscriberToken(token);
        if (payload?.email) {
          const sub = await prisma.subscriber.findUnique({
            where: { email: payload.email },
          });
          if (sub?.status === 'active' && (!sub.expiresAt || new Date() <= sub.expiresAt)) {
            isSubscriber = true;
          }
        }
      }
    }

    const comicArticles = await prisma.article.findMany({
      where: {
        category: {
          in: ['Comics', 'comics', 'Comic', 'comic'],
        },
      },
      orderBy: {
        order: 'asc',
      },
    });

    const parsedComics = comicArticles.map((art) => {
      let pages = [];
      let synopsis = '';

      if (art.content) {
        const trimmed = art.content.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          try {
            const data = JSON.parse(trimmed);
            if (Array.isArray(data.pages)) {
              pages = data.pages;
            }
            if (data.synopsis) {
              synopsis = data.synopsis;
            } else if (data.description) {
              synopsis = data.description;
            }
          } catch {
            synopsis = art.content.replace(/<\/?[^>]+(>|$)/g, '');
          }
        } else {
          // If content has markdown/HTML or plain text
          synopsis = art.content.replace(/<\/?[^>]+(>|$)/g, '');
          // Extract any image URLs in content
          const imgMatches = art.content.match(/https?:\/\/[^\s"'>)]+\.(?:jpg|jpeg|png|webp|avif)/gi);
          if (imgMatches && imgMatches.length > 0) {
            pages = imgMatches;
          }
        }
      }

      // If no separate pages were uploaded, default to using the cover as page 1
      if (pages.length === 0 && art.image) {
        pages = [art.image];
      }

      return {
        id: art.id,
        title: art.title,
        author: art.author,
        date: art.date,
        image: art.image,
        category: art.category,
        synopsis: synopsis || art.title,
        pages,
        pageCount: pages.length,
        isSubscriber,
      };
    });

    return NextResponse.json(parsedComics);
  } catch (error) {
    console.error('Error fetching comics:', error);
    return NextResponse.json({ error: 'Failed to fetch comics.' }, { status: 500 });
  }
}
