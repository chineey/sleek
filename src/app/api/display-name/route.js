import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { verifySubscriberToken } from '../../../lib/subscriberToken';
import prisma from '../../../lib/prisma';

const RESERVED_WORDS = ['admin', 'moderator', 'support', 'sleek'];
const MIN_LENGTH = 3;
const MAX_LENGTH = 12;

function validateDisplayName(name) {
  if (name.length < MIN_LENGTH) {
    return { valid: false, error: `Display name must be at least ${MIN_LENGTH} characters` };
  }
  if (name.length > MAX_LENGTH) {
    return { valid: false, error: `Display name must be at most ${MAX_LENGTH} characters` };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    return { valid: false, error: 'Display name can only contain letters, numbers, and underscores' };
  }

  const lowerName = name.toLowerCase();
  for (const word of RESERVED_WORDS) {
    if (lowerName.includes(word)) {
      return { valid: false, error: `Display name cannot contain reserved word: "${word}"` };
    }
  }

  return { valid: true };
}

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

// GET current user's display name
export async function GET(req) {
  try {
    const email = await getSubscriberEmail(req);
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscriber = await prisma.subscriber.findUnique({
      where: { email },
    });

    if (!subscriber) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
    }

    const displayNameRecord = await prisma.displayName.findUnique({
      where: { subscriberId: subscriber.id },
    });

    if (!displayNameRecord) {
      return NextResponse.json({ displayName: null });
    }

    return NextResponse.json({ displayName: displayNameRecord.displayName });
  } catch (error) {
    console.error('Error fetching display name:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST set/update display name
export async function POST(req) {
  try {
    const email = await getSubscriberEmail(req);
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { displayName } = await req.json();

    if (!displayName) {
      return NextResponse.json({ error: 'Display name is required' }, { status: 400 });
    }

    // Validate format
    const validation = validateDisplayName(displayName);
    if (!validation.valid) {
      return NextResponse.json(validation, { status: 400 });
    }

    // Get subscriber
    const subscriber = await prisma.subscriber.findUnique({
      where: { email },
    });

    if (!subscriber) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
    }

    // Check if display name already exists (case-insensitive) for another user
    const existing = await prisma.displayName.findUnique({
      where: { displayName: displayName.toLowerCase() },
    });

    if (existing && existing.subscriberId !== subscriber.id) {
      return NextResponse.json(
        { error: 'Display name already taken' },
        { status: 409 }
      );
    }

    // Upsert display name (update if exists, create if not)
    const updated = await prisma.displayName.upsert({
      where: { subscriberId: subscriber.id },
      update: { displayName: displayName.toLowerCase() },
      create: {
        subscriberId: subscriber.id,
        displayName: displayName.toLowerCase(),
      },
    });

    return NextResponse.json({ displayName: updated.displayName, success: true });
  } catch (error) {
    console.error('Error setting display name:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
