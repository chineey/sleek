import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { verifySubscriberToken } from '../../../../lib/subscriberToken';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const token = req.cookies.get('subscriber_token')?.value;

    if (!token) {
      return NextResponse.json({ isSubscriber: false });
    }

    const payload = verifySubscriberToken(token);
    if (!payload || !payload.email) {
      return NextResponse.json({ isSubscriber: false });
    }

    // Verify subscriber is still active in DB
    const subscriber = await prisma.subscriber.findUnique({
      where: { email: payload.email }
    });

    if (!subscriber || subscriber.status !== 'active') {
      // Clear invalid cookie
      const response = NextResponse.json({ isSubscriber: false });
      response.cookies.delete('subscriber_token');
      return response;
    }

    return NextResponse.json({ isSubscriber: true, email: subscriber.email });
  } catch (error) {
    console.error('Error fetching subscriber status:', error);
    return NextResponse.json({ isSubscriber: false });
  }
}
