import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '../../../../lib/prisma';
import { sendSubscriptionConfirmationEmail, sendOrderConfirmationEmail } from '../../../../lib/email';
import { generateOrderReference } from '../../../../lib/orderReference';

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
      const hashBuf = Buffer.from(hash, 'hex');
      const sigBuf = Buffer.from(signature, 'hex');

      if (hashBuf.length !== sigBuf.length || !crypto.timingSafeEqual(hashBuf, sigBuf)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    console.log('[WEBHOOK] Received event from Paystack:', payload.event);

    // Handle Subscription Lifecycle Events
    if (payload.event === 'subscription.create') {
      const customerEmail = payload.data?.customer?.email;
      const customerId = String(payload.data?.customer?.id || '');
      if (customerEmail) {
        console.log(`[WEBHOOK] Subscription created: ${customerEmail}`);
        await prisma.subscriber.upsert({
          where: { email: customerEmail },
          update: { status: 'active', paystackCustomerId: customerId },
          create: { email: customerEmail, status: 'active', paystackCustomerId: customerId },
        });
      }
      return NextResponse.json({ status: 'ok', message: 'Subscription activated' });
    }

    if (
      payload.event === 'subscription.disable' || 
      payload.event === 'subscription.not_renew' || 
      payload.event === 'invoice.payment_failed'
    ) {
      const customerEmail = 
        payload.data?.customer?.email || 
        payload.data?.subscription?.customer?.email || 
        payload.data?.email;

      if (customerEmail) {
        console.log(`[WEBHOOK] Deactivating subscriber due to ${payload.event}: ${customerEmail}`);
        await prisma.subscriber.updateMany({
          where: { email: customerEmail },
          data: { status: 'inactive' },
        });
      }
      return NextResponse.json({ status: 'ok', message: `Processed ${payload.event}` });
    }

    // Verify event is successful charge
    if (payload.event === 'charge.success' && payload.data?.status === 'success') {
      const metadata = payload.data?.metadata || {};
      const reference = payload.data?.reference;
      const customerEmail = payload.data?.customer?.email || metadata.email;

      const isSubscriptionCharge = 
        metadata.payment_type === 'subscription' || 
        Boolean(payload.data?.plan) || 
        Boolean(payload.data?.plan_object) || 
        Boolean(metadata.plan_code);

      // 1. Subscription Flow
      if (isSubscriptionCharge) {
        const customerId = String(payload.data?.customer?.id || '');
        console.log(`[WEBHOOK] Activating subscriber: ${customerEmail}`);

        const existingSubscriber = await prisma.subscriber.findUnique({ where: { email: customerEmail } });
        const wasAlreadyActive = existingSubscriber?.status === 'active';
        const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

        await prisma.subscriber.upsert({
          where: { email: customerEmail },
          update: {
            status: 'active',
            paystackCustomerId: customerId,
            paystackReference: reference,
            expiresAt,
          },
          create: {
            email: customerEmail,
            status: 'active',
            paystackCustomerId: customerId,
            paystackReference: reference,
            expiresAt,
          }
        });

        if (!wasAlreadyActive) {
          try {
            await sendSubscriptionConfirmationEmail(customerEmail);
          } catch (emailErr) {
            console.error('[WEBHOOK] Failed to send subscription confirmation email:', emailErr);
          }
        }
      } 
      // 2. Shop Order Flow
      else if (metadata.payment_type === 'shop_order' || metadata.productId || metadata.orderReference) {
        console.log(`[WEBHOOK] Processing shop order for: ${customerEmail}, Paystack Ref: ${reference}`);

        // Idempotency check: Look for existing order with this paystack reference
        let existingOrder = null;
        if (reference) {
          existingOrder = await prisma.shopOrder.findUnique({
            where: { paystackReference: reference },
          });
        }

        // If not found by paystackReference, check by orderReference from metadata
        if (!existingOrder && metadata.orderReference) {
          existingOrder = await prisma.shopOrder.findUnique({
            where: { orderReference: metadata.orderReference },
          });
        }

        // If order was already marked paid or completed, do not duplicate order or emails
        if (existingOrder && (existingOrder.status === 'paid' || existingOrder.status === 'completed')) {
          console.log(`[WEBHOOK] Order #${existingOrder.orderReference} is already processed (${existingOrder.status}). Skipping duplicate execution.`);
          return NextResponse.json({ status: 'ok', message: 'Order already processed' });
        }

        // Resolve pickup location details
        let pickupLocName = metadata.pickupLocationName || existingOrder?.pickupLocationName || null;
        let pickupLocAddress = metadata.pickupLocationAddress || existingOrder?.pickupLocationAddress || null;
        let pickupLocHours = metadata.pickupLocationOpeningHours || existingOrder?.pickupLocationOpeningHours || null;
        const pickupLocId = metadata.pickupLocationId || existingOrder?.pickupLocationId || null;

        if (pickupLocId && (!pickupLocName || !pickupLocAddress || !pickupLocHours)) {
          try {
            const locRecord = await prisma.pickupLocation.findUnique({
              where: { id: pickupLocId },
            });
            if (locRecord) {
              pickupLocName = pickupLocName || locRecord.name;
              pickupLocAddress = pickupLocAddress || locRecord.address;
              pickupLocHours = pickupLocHours || locRecord.openingHours;
            }
          } catch (locErr) {
            console.warn('[WEBHOOK] Could not fetch pickup location record:', locErr);
          }
        }

        const priceInNaira = metadata.price 
          ? parseInt(metadata.price, 10) 
          : Math.round((payload.data.amount || 0) / 100);

        const productName = metadata.productName || existingOrder?.productName || 'SLEEK Magazine Physical Copy';
        const productId = metadata.productId || existingOrder?.productId || null;
        const orderRef = existingOrder?.orderReference || metadata.orderReference || generateOrderReference(10);

        let orderRecord;

        if (existingOrder) {
          orderRecord = await prisma.shopOrder.update({
            where: { id: existingOrder.id },
            data: {
              status: 'paid',
              paystackReference: reference,
              productName,
              price: priceInNaira,
              pickupLocationId: pickupLocId,
              pickupLocationName: pickupLocName,
              pickupLocationAddress: pickupLocAddress,
              pickupLocationOpeningHours: pickupLocHours,
            },
          });
        } else {
          orderRecord = await prisma.shopOrder.create({
            data: {
              orderReference: orderRef,
              email: customerEmail,
              productId,
              productName,
              price: priceInNaira,
              pickupLocationId: pickupLocId,
              pickupLocationName: pickupLocName,
              pickupLocationAddress: pickupLocAddress,
              pickupLocationOpeningHours: pickupLocHours,
              paystackReference: reference,
              status: 'paid',
              emailStatus: 'pending',
            },
          });
        }

        // Decrement product inventory if valid productId
        if (productId) {
          try {
            await prisma.product.updateMany({
              where: { id: productId, stock: { gt: 0 } },
              data: { stock: { decrement: 1 } },
            });
          } catch (stockErr) {
            console.error('[WEBHOOK] Failed to update product stock:', stockErr);
          }
        }

        // Send confirmation email if not yet sent
        if (orderRecord.emailStatus !== 'sent') {
          let emailStatus = 'pending';
          let emailError = null;

          try {
            const emailRes = await sendOrderConfirmationEmail({
              orderReference: orderRecord.orderReference,
              email: orderRecord.email,
              productName: orderRecord.productName,
              price: orderRecord.price,
              pickupLocationName: orderRecord.pickupLocationName,
              pickupLocationAddress: orderRecord.pickupLocationAddress,
              pickupLocationOpeningHours: orderRecord.pickupLocationOpeningHours,
            });

            emailStatus = emailRes?.ok ? 'sent' : 'failed';
          } catch (emailErr) {
            console.error('[WEBHOOK ERROR] Failed to send order confirmation email:', emailErr);
            emailStatus = 'failed';
            emailError = emailErr?.message || String(emailErr);
          }

          // Save email delivery state and any logged failure
          await prisma.shopOrder.update({
            where: { id: orderRecord.id },
            data: {
              emailStatus,
              emailError,
            },
          });

          console.log(`[WEBHOOK] Order #${orderRecord.orderReference} fulfilled successfully. Email status: ${emailStatus}`);
        } else {
          console.log(`[WEBHOOK] Confirmation email already sent for order #${orderRecord.orderReference}.`);
        }
      } else {
        console.log('[WEBHOOK] Unrecognized charge metadata type. Event acknowledged.', metadata);
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}