import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '../../../../lib/prisma';
import { sendMagicLinkEmail } from '../../../../lib/email';

export async function POST(req) {
  try {
    const { email } = await req.json();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }

    // Lookup subscriber
    const subscriber = await prisma.subscriber.findUnique({
      where: { email }
    });

    // Check if subscriber exists and is active
    if (subscriber && subscriber.status === 'active') {
      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

      // Save token in DB
      await prisma.magicLink.create({
        data: {
          email,
          token,
          expiresAt
        }
      });

      // Send the email
      await sendMagicLinkEmail(email, token);
    } else {
      console.log(`[MAGIC LINK] Request received for inactive/non-existent subscriber: ${email}. Returned mock success to prevent enumeration.`);
    }

    // Return generic success message to prevent enumeration
    return NextResponse.json({
      message: 'If the email is associated with an active subscription, a magic link has been sent.'
    });
  } catch (error) {
    console.error('Error requesting magic link:', error);
    return NextResponse.json(
      { error: 'Failed to process magic link request.' },
      { status: 500 }
    );
  }
}
