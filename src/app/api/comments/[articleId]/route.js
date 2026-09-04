import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { verifySubscriberToken } from '../../../../lib/subscriberToken';
import prisma from '../../../../lib/prisma';

// Get subscriber email from either NextAuth session or subscriber token
async function getSubscriberEmail(req) {
  // Try NextAuth session first
  const session = await getServerSession(authOptions);
  if (session?.user?.email) {
    return session.user.email;
  }

  // Try subscriber token cookie
  const token = req.cookies.get('subscriber_token')?.value;
  if (token) {
    const payload = verifySubscriberToken(token);
    if (payload?.email) {
      return payload.email;
    }
  }

  return null;
}

// GET comments for an article with replies
export async function GET(req, { params }) {
  try {
    const { articleId } = params;

    if (!articleId || isNaN(parseInt(articleId))) {
      return NextResponse.json({ error: 'Invalid article ID' }, { status: 400 });
    }

    // Fetch top-level comments (without parent)
    const topLevelComments = await prisma.comment.findMany({
      where: { articleId: parseInt(articleId), parentCommentId: null },
      select: {
        id: true,
        displayName: true,
        content: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // For each top-level comment, fetch its replies
    const commentsWithReplies = await Promise.all(
      topLevelComments.map(async (comment) => {
        const replies = await prisma.comment.findMany({
          where: { parentCommentId: comment.id },
          select: {
            id: true,
            displayName: true,
            content: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        });
        return { ...comment, replies };
      })
    );

    return NextResponse.json({ comments: commentsWithReplies });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create a comment
export async function POST(req, { params }) {
  try {
    const email = await getSubscriberEmail(req);
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { articleId, content, parentCommentId } = await req.json();

    if (!articleId || isNaN(parseInt(articleId))) {
      return NextResponse.json({ error: 'Invalid article ID' }, { status: 400 });
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
    }

    // Get subscriber
    const subscriber = await prisma.subscriber.findUnique({
      where: { email },
    });

    if (!subscriber) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
    }

    if (subscriber.status !== 'active') {
      return NextResponse.json({ error: 'Only active subscribers can comment' }, { status: 403 });
    }

    // Get display name
    const displayNameRecord = await prisma.displayName.findUnique({
      where: { subscriberId: subscriber.id },
    });

    if (!displayNameRecord) {
      return NextResponse.json({ error: 'Display name not set' }, { status: 400 });
    }

    // Validate parent comment exists if replying
    if (parentCommentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentCommentId },
      });
      if (!parentComment) {
        return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 });
      }
    }

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        articleId: parseInt(articleId),
        subscriberId: subscriber.id,
        displayName: displayNameRecord.displayName,
        content: content.trim(),
        parentCommentId: parentCommentId || null,
      },
      select: {
        id: true,
        displayName: true,
        content: true,
        createdAt: true,
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
