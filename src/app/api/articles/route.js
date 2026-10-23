import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import prisma from '../../../lib/prisma';
import { sendNewArticleNotificationEmail } from '../../../lib/email';
import { verifySubscriberToken } from '../../../lib/subscriberToken';

// GET all articles sorted by order ascending
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    let isSubscriber = false;

    if (session) {
      isSubscriber = true; // Admin has full access
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

    const articles = await prisma.article.findMany({
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // Allow non-subscribers full access to articles in category: fashion, culture, business news, sports, events, sleekpeak
    // Comics and editorial articles show preview only to non-subscribers and are locked.
    const FREE_CATEGORIES = ['fashion', 'culture', 'businessnews', 'sports', 'events', 'event', 'sleekpeak'];

    const sanitizedArticles = articles.map((art) => {
      const normCat = art.category?.toLowerCase().replace(/\s+/g, '') || '';
      const isSleekPeak = normCat === 'sleekpeak';
      const isComics = normCat === 'comics' || normCat === 'comic';
      const isFree = FREE_CATEGORIES.includes(normCat);

      if (!isSubscriber) {
        if (isFree) {
          // Full access for non-subscribers
          return {
            ...art,
            content: art.content,
            isPaywalled: false,
            isSleekPeak,
            isComics,
          };
        } else {
          // Editorial or other gated categories: preview only
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

    return NextResponse.json(sanitizedArticles);
  } catch (error) {
    console.error('Error fetching articles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch articles.' },
      { status: 500 }
    );
  }
}

// POST a new article (Admin only)
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin session required.' },
        { status: 401 }
      );
    }

    const { title, category, author, date, image, content } = await req.json();

    if (!title || !category || !author || !date || !image || !content) {
      return NextResponse.json(
        { error: 'All fields are required.' },
        { status: 400 }
      );
    }

    // Determine placement: new article uploads as the top in its category.
    // Fetch all existing articles ordered by order asc, createdAt desc
    const existingArticles = await prisma.article.findMany({
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    const normalizeCat = (c) => c?.toLowerCase().replace(/\s+/g, '') || '';
    const targetCatNorm = normalizeCat(category);

    // Find the first article that belongs to the same category
    const firstCatIndex = existingArticles.findIndex(
      (art) => normalizeCat(art.category) === targetCatNorm
    );

    // If this category already has articles, place the new article right before the first one.
    // If it's a new category without articles yet, place it at the top (index 0).
    const insertIndex = firstCatIndex === -1 ? 0 : firstCatIndex;

    // Shift all articles at and after insertIndex by updating their order
    const updateOperations = [];
    for (let i = insertIndex; i < existingArticles.length; i++) {
      updateOperations.push(
        prisma.article.update({
          where: { id: existingArticles[i].id },
          data: { order: i + 1 },
        })
      );
    }

    const [newArticle] = await prisma.$transaction([
      prisma.article.create({
        data: {
          title,
          category,
          author,
          date,
          image,
          content,
          order: insertIndex,
        },
      }),
      ...updateOperations,
    ]);

    try {
      revalidatePath('/');
    } catch (revalidateError) {
      console.warn('Failed to revalidate home page after article creation:', revalidateError);
    }

    // Send subscriber notifications in background without blocking the admin response
    (async () => {
      try {
        const activeSubscribers = await prisma.subscriber.findMany({
          where: { status: 'active' },
          select: { email: true },
        });

        const subscriberEmails = activeSubscribers.map((subscriber) => subscriber.email);
        if (subscriberEmails.length > 0) {
          await sendNewArticleNotificationEmail(newArticle, subscriberEmails);
        }
      } catch (notificationError) {
        console.error('Error sending new article notifications in background:', notificationError);
      }
    })();

    return NextResponse.json(newArticle, { status: 201 });
  } catch (error) {
    console.error('Error creating article:', error);
    return NextResponse.json(
      { error: 'Failed to create article.' },
      { status: 500 }
    );
  }
}

// PUT/update an existing article (Admin only)
export async function PUT(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin session required.' },
        { status: 401 }
      );
    }

    const { id, title, category, author, date, image, content } = await req.json();

    if (!id || !title || !category || !author || !date || !image || !content) {
      return NextResponse.json(
        { error: 'All fields are required.' },
        { status: 400 }
      );
    }

    const updatedArticle = await prisma.article.update({
      where: { id: parseInt(id) },
      data: {
        title,
        category,
        author,
        date,
        image,
        content,
      },
    });

    try {
      revalidatePath('/');
      revalidatePath(`/article/${id}`);
    } catch {}

    return NextResponse.json(updatedArticle);
  } catch (error) {
    console.error('Error updating article:', error);
    return NextResponse.json(
      { error: 'Failed to update article.' },
      { status: 500 }
    );
  }
}

// DELETE an existing article (Admin only)
export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin session required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Article ID is required.' },
        { status: 400 }
      );
    }

    const articleIdInt = parseInt(id);

    // Delete associated comments and replies to prevent orphaned rows
    await prisma.comment.deleteMany({
      where: { articleId: articleIdInt },
    });

    const deletedArticle = await prisma.article.delete({
      where: { id: articleIdInt },
    });

    try {
      revalidatePath('/');
    } catch {}

    return NextResponse.json({ message: 'Article deleted successfully.', deletedArticle });
  } catch (error) {
    console.error('Error deleting article:', error);
    return NextResponse.json(
      { error: 'Failed to delete article.' },
      { status: 500 }
    );
  }
}

// PATCH/reorder articles in bulk (Admin only)
export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin session required.' },
        { status: 401 }
      );
    }

    const { orders } = await req.json(); // Array of { id, order }

    if (!orders || !Array.isArray(orders)) {
      return NextResponse.json(
        { error: 'Invalid orders data. Array required.' },
        { status: 400 }
      );
    }

    // Run order updates as a single atomic transaction
    await prisma.$transaction(
      orders.map((o) =>
        prisma.article.update({
          where: { id: parseInt(o.id) },
          data: { order: parseInt(o.order) },
        })
      )
    );

    try {
      revalidatePath('/');
    } catch {}

    return NextResponse.json({ message: 'Ordering layout saved successfully.' });
  } catch (error) {
    console.error('Error updating articles layout order:', error);
    return NextResponse.json(
      { error: 'Failed to update articles layout order.' },
      { status: 500 }
    );
  }
}
