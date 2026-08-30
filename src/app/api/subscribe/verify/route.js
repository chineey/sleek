import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { verifyTransaction } from '../../../../lib/paystack';
import { createSubscriberToken } from '../../../../lib/subscriberToken';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const reference = searchParams.get('reference');
  const nextAuthUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  if (!reference) {
    return NextResponse.redirect(`${nextAuthUrl}?error=missing_reference`);
  }

  try {
    let email = null;
    let customerId = null;

    // Check if mock mode
    if (reference.startsWith('mock_ref_')) {
      // Find the subscriber by reference
      const sub = await prisma.subscriber.findFirst({
        where: { paystackReference: reference }
      });
      if (!sub) {
        return NextResponse.redirect(`${nextAuthUrl}?error=subscriber_not_found`);
      }
      email = sub.email;
      customerId = 'mock_customer_id';
    } else {
      // Real verification
      const verificationData = await verifyTransaction(reference);
      if (verificationData.status !== 'success') {
        return NextResponse.redirect(`${nextAuthUrl}?error=payment_failed`);
      }
      
      // Ensure this transaction was for a subscription
      const metadata = verificationData.metadata;
      if (!metadata || metadata.payment_type !== 'subscription') {
        // Not a subscription, redirect to a general payment success page
        return NextResponse.redirect(`${nextAuthUrl}?payment=success&reference=${reference}`);
      }

      email = verificationData.customer.email;
      customerId = String(verificationData.customer.id || '');
    }

    // Mark subscriber active
    await prisma.subscriber.update({
      where: { email },
      data: {
        status: 'active',
        paystackCustomerId: customerId,
        paystackReference: reference
      }
    });

    // Create session token
    const token = createSubscriberToken(email);

    // Redirect to homepage with cookie and success query param
    const response = NextResponse.redirect(`${nextAuthUrl}?subscribed=true`);
    
    // Cookie expires in 30 days
    response.cookies.set('subscriber_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('Error verifying transaction:', error);
    return NextResponse.redirect(`${nextAuthUrl}?error=verification_error`);
  }
}
