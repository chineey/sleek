import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { verifySubscriberToken } from '../../../../../lib/subscriberToken';
import prisma from '../../../../../lib/prisma';

// Helper to extract email from session or subscriber cookie
async function getSubscriberEmail(req) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email) {
    return session.user.email;
  }

  const token = req.cookies.get('subscriber_token')?.value;
  if (token) {
    const payload = verifySubscriberToken(token);
    if (payload?.email) {
      return payload.email;
    }
  }

  return null;
}

// GET all comments for an event (threaded)
export async function GET(req, { params }) {
  try {
    const { id: eventId } = params;

    if (!eventId) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    const allComments = await prisma.eventComment.findMany({
      where: { eventId },
      select: {
        id: true,
        displayName: true,
        content: true,
        parentCommentId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const topLevel = [];
    const repliesByParent = {};

    for (const comment of allComments) {
      if (!comment.parentCommentId) {
        topLevel.push({ ...comment, replies: [] });
      } else {
        if (!repliesByParent[comment.parentCommentId]) {
          repliesByParent[comment.parentCommentId] = [];
        }
        repliesByParent[comment.parentCommentId].push(comment);
      }
    }

    // Sort newest top-level first
    topLevel.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const commentsWithReplies = topLevel.map((comment) => ({
      ...comment,
      replies: repliesByParent[comment.id] || [],
    }));

    return NextResponse.json({ comments: commentsWithReplies });
  } catch (error) {
    console.error('Error fetching event comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create a comment or reply on an event
export async function POST(req, { params }) {
  try {
    const { id: eventId } = params;
    const email = await getSubscriberEmail(req);

    if (!email) {
      return NextResponse.json({ error: 'Only subscribers can post comments' }, { status: 401 });
    }

    const { content, parentCommentId } = await req.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
    }

    const subscriber = await prisma.subscriber.findUnique({
      where: { email },
    });

    if (!subscriber) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
    }

    if (subscriber.status !== 'active') {
      return NextResponse.json({ error: 'Only active subscribers can comment' }, { status: 403 });
    }

    if (subscriber.expiresAt && new Date() > subscriber.expiresAt) {
      return NextResponse.json({ error: 'Your subscription has expired. Please renew.' }, { status: 403 });
    }

    const displayNameRecord = await prisma.displayName.findUnique({
      where: { subscriberId: subscriber.id },
    });

    if (!displayNameRecord) {
      return NextResponse.json({ error: 'Display name not set' }, { status: 400 });
    }

    if (parentCommentId) {
      const parent = await prisma.eventComment.findUnique({
        where: { id: parentCommentId },
      });
      if (!parent) {
        return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 });
      }
    }

    const comment = await prisma.eventComment.create({
      data: {
        eventId,
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
    console.error('Error creating event comment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
