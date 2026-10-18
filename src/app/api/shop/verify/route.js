import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { verifyTransaction } from '../../../../lib/paystack';
import { sendOrderConfirmationEmail } from '../../../../lib/email';
import { generateOrderReference } from '../../../../lib/orderReference';
import { getBaseUrl } from '../../../../lib/url';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const reference = searchParams.get('reference') || searchParams.get('trxref');
  const nextAuthUrl = getBaseUrl(req);

  if (!reference) {
    return NextResponse.redirect(`${nextAuthUrl}/shop?error=missing_reference`);
  }

  try {
    let order = await prisma.shopOrder.findUnique({
      where: { paystackReference: reference },
    });

    // Check if mock reference (for development)
    if (reference.startsWith('mock_shop_')) {
      if (!order) {
        return NextResponse.redirect(`${nextAuthUrl}/shop?error=order_not_found`);
      }
    } else {
      // Real Paystack verification
      const verificationData = await verifyTransaction(reference);
      if (verificationData.status !== 'success') {
        return NextResponse.redirect(`${nextAuthUrl}/shop?error=payment_failed`);
      }

      const metadata = verificationData.metadata || {};

      if (!order && metadata.orderReference) {
        order = await prisma.shopOrder.findUnique({
          where: { orderReference: metadata.orderReference },
        });
      }

      // If order was not found in DB, create it from verified Paystack data
      if (!order) {
        const customerEmail = verificationData.customer?.email || metadata.email;
        const priceInNaira = metadata.price
          ? parseInt(metadata.price, 10)
          : Math.round((verificationData.amount || 0) / 100);
        const orderRef = metadata.orderReference || generateOrderReference(10);

        order = await prisma.shopOrder.create({
          data: {
            orderReference: orderRef,
            email: customerEmail,
            productId: metadata.productId || null,
            productName: metadata.productName || 'SLEEK Magazine Physical Copy',
            price: priceInNaira,
            pickupLocationId: metadata.pickupLocationId || null,
            pickupLocationName: metadata.pickupLocationName || null,
            pickupLocationAddress: metadata.pickupLocationAddress || null,
            pickupLocationOpeningHours: metadata.pickupLocationOpeningHours || 'Mon - Sat: 9:00 AM - 6:00 PM',
            paystackReference: reference,
            status: 'paid',
            emailStatus: 'pending',
          },
        });
      }
    }

    // Fulfill order if not yet marked paid
    const wasAlreadyPaid = order.status === 'paid' || order.status === 'completed';
    const wasEmailSent = order.emailStatus === 'sent';

    if (!wasAlreadyPaid) {
      await prisma.shopOrder.update({
        where: { id: order.id },
        data: { status: 'paid' },
      });

      if (order.productId) {
        try {
          await prisma.product.updateMany({
            where: { id: order.productId, stock: { gt: 0 } },
            data: { stock: { decrement: 1 } },
          });
        } catch (stockErr) {
          console.error('[SHOP VERIFY] Failed to decrement product stock:', stockErr);
        }
      }
    }

    // Send confirmation email if not sent yet
    if (!wasEmailSent) {
      let emailStatus = 'pending';
      let emailError = null;

      try {
        const emailRes = await sendOrderConfirmationEmail({
          orderReference: order.orderReference,
          email: order.email,
          productName: order.productName,
          price: order.price,
          pickupLocationName: order.pickupLocationName,
          pickupLocationAddress: order.pickupLocationAddress,
          pickupLocationOpeningHours: order.pickupLocationOpeningHours,
        });

        emailStatus = emailRes?.ok ? 'sent' : 'failed';
      } catch (emailErr) {
        console.error('[SHOP VERIFY ERROR] Failed to send order confirmation email:', emailErr);
        emailStatus = 'failed';
        emailError = emailErr?.message || String(emailErr);
      }

      await prisma.shopOrder.update({
        where: { id: order.id },
        data: { emailStatus, emailError },
      });
    }

    return NextResponse.redirect(`${nextAuthUrl}/shop?checkout=success&order=${order.orderReference}`);
  } catch (error) {
    console.error('Error in shop verify route:', error);
    return NextResponse.redirect(`${nextAuthUrl}/shop?error=verification_failed`);
  }
}
