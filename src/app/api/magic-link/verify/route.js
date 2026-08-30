import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { createSubscriberToken } from '../../../../lib/subscriberToken';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const nextAuthUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  if (!token) {
    return NextResponse.redirect(`${nextAuthUrl}?login_error=invalid_token`);
  }

  try {
    const magicLink = await prisma.magicLink.findUnique({
      where: { token }
    });

    if (!magicLink || magicLink.used || new Date() > magicLink.expiresAt) {
      return NextResponse.redirect(`${nextAuthUrl}?login_error=expired_or_invalid`);
    }

    // Mark as used
    await prisma.magicLink.update({
      where: { token },
      data: { used: true }
    });

    // Double check subscriber is active
    const subscriber = await prisma.subscriber.findUnique({
      where: { email: magicLink.email }
    });

    if (!subscriber || subscriber.status !== 'active') {
      return NextResponse.redirect(`${nextAuthUrl}?login_error=not_active_subscriber`);
    }

    // Create session token
    const subscriberToken = createSubscriberToken(magicLink.email);

    // Redirect to homepage with cookie and login success param
    const response = NextResponse.redirect(`${nextAuthUrl}?login=success`);
    
    // Cookie expires in 30 days
    response.cookies.set('subscriber_token', subscriberToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('Error verifying magic link:', error);
    return NextResponse.redirect(`${nextAuthUrl}?login_error=system_error`);
  }
}
