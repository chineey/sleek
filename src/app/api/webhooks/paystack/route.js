import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '../../../../lib/prisma';
import { sendSubscriptionConfirmationEmail } from '../../../../lib/email';

export async function POST(req) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature header' }, { status: 400 });
    }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    
    // Check if real key is configured (skip verification if placeholder for development ease)
    const isSecretConfigured = paystackSecret && 
      !paystackSecret.includes('your-') && 
      !paystackSecret.includes('sk_test_xxx') &&
      paystackSecret.trim() !== '';

    if (!isSecretConfigured) {
      console.warn('[WEBHOOK] PAYSTACK_SECRET_KEY not set or placeholder. Skipping verification.');
    } else {
      const hash = crypto
        .createHmac('sha512', paystackSecret)
        .update(rawBody)
        .digest('hex');

      if (hash !== signature) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    console.log('[WEBHOOK] Received event from Paystack:', payload.event);

    if (payload.event === 'charge.success') {
      const metadata = payload.data.metadata;
      
      if (metadata && metadata.payment_type === 'subscription') {
        const email = payload.data.customer.email;
        const reference = payload.data.reference;
        const customerId = String(payload.data.customer.id || '');

        console.log(`[WEBHOOK] Activating subscriber: ${email}`);

        // Check prior status so we only send the confirmation email on a genuine
        // new activation, not on every webhook retry Paystack sends for the same event.
        const existingSubscriber = await prisma.subscriber.findUnique({ where: { email } });
        const wasAlreadyActive = existingSubscriber?.status === 'active';

        // Upsert subscriber to active
        await prisma.subscriber.upsert({
          where: { email },
          update: {
            status: 'active',
            paystackCustomerId: customerId,
            paystackReference: reference
          },
          create: {
            email,
            status: 'active',
            paystackCustomerId: customerId,
            paystackReference: reference
          }
        });

        if (!wasAlreadyActive) {
          try {
            await sendSubscriptionConfirmationEmail(email);
          } catch (emailErr) {
            console.error('[WEBHOOK] Failed to send subscription confirmation email:', emailErr);
          }
        }
      } else {
        console.log('[WEBHOOK] Non-subscription payment success event ignored.', metadata);
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}