import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { initializeTransaction } from '../../../../lib/paystack';

export async function POST(req) {
  try {
    const { email } = await req.json();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }

    // 1. Create or find Subscriber (defaulting to inactive)
    let subscriber = await prisma.subscriber.findUnique({
      where: { email },
    });

    if (!subscriber) {
      subscriber = await prisma.subscriber.create({
        data: { email, status: 'inactive' },
      });
    }

    // 2. Paystack transaction configuration
    // Amount in kobo: ₦5,000 is 5000 * 100 = 500000 kobo
    const amount = 500000; 
    const nextAuthUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const callbackUrl = `${nextAuthUrl}/api/subscribe/verify`;

    // 3. Initialize Paystack transaction (or mock if keys not present)
    const isPaystackKeyConfigured = process.env.PAYSTACK_SECRET_KEY && 
      !process.env.PAYSTACK_SECRET_KEY.includes('your-') && 
      !process.env.PAYSTACK_SECRET_KEY.includes('sk_test_xxx') &&
      process.env.PAYSTACK_SECRET_KEY.trim() !== '';

    if (!isPaystackKeyConfigured) {
      console.log('[PAYSTACK] Secret key not configured or contains placeholder. Generating mock checkout redirect.');
      const mockReference = `mock_ref_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // Update subscriber reference for manual tracking in mock mode
      await prisma.subscriber.update({
        where: { email },
        data: { paystackReference: mockReference }
      });

      const mockCheckoutUrl = `${nextAuthUrl}/api/subscribe/verify?reference=${mockReference}`;
      return NextResponse.json({ authorization_url: mockCheckoutUrl, mock: true });
    }

    const paystackData = await initializeTransaction({
      email,
      amount,
      callbackUrl,
      metadata: {
        payment_type: 'subscription'
      }
    });

    // Save the reference to the subscriber record
    await prisma.subscriber.update({
      where: { email },
      data: { paystackReference: paystackData.reference },
    });

    return NextResponse.json({ authorization_url: paystackData.authorization_url });
  } catch (error) {
    console.error('Error initiating subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate transaction.' },
      { status: 500 }
    );
  }
}
