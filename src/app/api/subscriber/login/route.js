import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { createSubscriberToken } from '../../../../lib/subscriberToken';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  try {
    const { identifier, password } = await req.json();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Please enter both your email/display name and password.' },
        { status: 400 }
      );
    }

    const cleanIdentifier = String(identifier).trim();
    let subscriber = null;

    // Check if identifier is an email
    if (cleanIdentifier.includes('@')) {
      subscriber = await prisma.subscriber.findUnique({
        where: { email: cleanIdentifier.toLowerCase() }
      });
    } else {
      // Lookup by display name
      const displayNameRecord = await prisma.displayName.findUnique({
        where: { displayName: cleanIdentifier.toLowerCase() }
      });

      if (displayNameRecord) {
        subscriber = await prisma.subscriber.findUnique({
          where: { id: displayNameRecord.subscriberId }
        });
      } else {
        // Fallback: check email in case user didn't type @ or similar
        subscriber = await prisma.subscriber.findUnique({
          where: { email: cleanIdentifier.toLowerCase() }
        });
      }
    }

    if (!subscriber) {
      return NextResponse.json(
        { error: 'No subscriber account found matching that email or display name.' },
        { status: 401 }
      );
    }

    // Check if subscriber has set a password yet
    if (!subscriber.password) {
      return NextResponse.json(
        {
          error: 'No password has been set for this account yet. Please sign in with Magic Link to set your password.',
          hasPassword: false,
          email: subscriber.email
        },
        { status: 400 }
      );
    }

    // Check if active
    if (subscriber.status !== 'active') {
      return NextResponse.json(
        { error: 'Your subscription is currently inactive. Please subscribe or renew your membership.' },
        { status: 403 }
      );
    }

    // Check if expired
    if (subscriber.expiresAt && new Date() > subscriber.expiresAt) {
      await prisma.subscriber.update({
        where: { id: subscriber.id },
        data: { status: 'inactive' }
      });
      return NextResponse.json(
        { error: 'Your subscription has expired. Please renew your subscription to continue.' },
        { status: 403 }
      );
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, subscriber.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Incorrect password. Please try again.' },
        { status: 401 }
      );
    }

    // Generate signed subscriber token
    const token = createSubscriberToken(subscriber.email);

    // Fetch display name for greeting if available
    const displayRecord = await prisma.displayName.findUnique({
      where: { subscriberId: subscriber.id }
    });

    const response = NextResponse.json({
      success: true,
      email: subscriber.email,
      displayName: displayRecord?.displayName || null,
      redirect: '/'
    });

    // Set 60 days cookie
    response.cookies.set('subscriber_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 24 * 60 * 60, // 60 days
    });

    return response;
  } catch (error) {
    console.error('[SUBSCRIBER LOGIN] Login error:', error);
    return NextResponse.json(
      { error: 'An unexpected authentication error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
