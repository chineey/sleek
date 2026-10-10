import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { initializeTransaction } from '../../../../lib/paystack';
import { generateOrderReference } from '../../../../lib/orderReference';

export async function POST(req) {
  try {
    const { productId, email, pickupLocationId } = await req.json();

    if (!productId || !email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'A valid product and email are required.' },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.active) {
      return NextResponse.json(
        { error: 'This product is unavailable.' },
        { status: 404 }
      );
    }

    if (product.stock <= 0) {
      return NextResponse.json(
        { error: 'This product is currently out of stock.' },
        { status: 400 }
      );
    }

    let pickupLocation = null;
    if (pickupLocationId) {
      pickupLocation = await prisma.pickupLocation.findUnique({
        where: { id: pickupLocationId },
      });
    }

    if (!pickupLocation) {
      return NextResponse.json(
        { error: 'Please select a valid pickup location.' },
        { status: 400 }
      );
    }

    const orderReference = generateOrderReference(10);
    const nextAuthUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    const isPaystackKeyConfigured = process.env.PAYSTACK_SECRET_KEY && 
      !process.env.PAYSTACK_SECRET_KEY.includes('your-') && 
      !process.env.PAYSTACK_SECRET_KEY.includes('sk_test_xxx') &&
      process.env.PAYSTACK_SECRET_KEY.trim() !== '';

    if (!isPaystackKeyConfigured) {
      console.log('[PAYSTACK SHOP] Secret key not configured or contains placeholder. Generating mock checkout redirect.');
      const mockReference = `mock_shop_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      const shopOrder = await prisma.shopOrder.create({
        data: {
          orderReference,
          email,
          productId: product.id,
          productName: product.name,
          price: product.price,
          pickupLocationId: pickupLocation.id,
          pickupLocationName: pickupLocation.name,
          pickupLocationAddress: pickupLocation.address,
          pickupLocationOpeningHours: pickupLocation.openingHours || 'Mon - Sat: 9:00 AM - 6:00 PM',
          paystackReference: mockReference,
          status: 'pending',
          emailStatus: 'pending',
        },
      });

      const mockCheckoutUrl = `${nextAuthUrl}/api/shop/verify?reference=${mockReference}&order=${orderReference}`;
      return NextResponse.json({
        authorization_url: mockCheckoutUrl,
        reference: mockReference,
        orderReference,
        orderId: shopOrder.id,
        mock: true,
      });
    }

    const callbackUrl = `${nextAuthUrl}/api/shop/verify`;

    const paystackData = await initializeTransaction({
      email,
      amount: product.price * 100, // in kobo
      callbackUrl,
      metadata: {
        payment_type: 'shop_order',
        orderReference,
        productId: product.id,
        productName: product.name,
        price: product.price,
        pickupLocationId: pickupLocation.id,
        pickupLocationName: pickupLocation.name,
        pickupLocationAddress: pickupLocation.address,
        pickupLocationOpeningHours: pickupLocation.openingHours || 'Mon - Sat: 9:00 AM - 6:00 PM',
        email,
      },
    });

    const shopOrder = await prisma.shopOrder.create({
      data: {
        orderReference,
        email,
        productId: product.id,
        productName: product.name,
        price: product.price,
        pickupLocationId: pickupLocation.id,
        pickupLocationName: pickupLocation.name,
        pickupLocationAddress: pickupLocation.address,
        pickupLocationOpeningHours: pickupLocation.openingHours || 'Mon - Sat: 9:00 AM - 6:00 PM',
        paystackReference: paystackData.reference,
        status: 'pending',
        emailStatus: 'pending',
      },
    });

    return NextResponse.json({
      authorization_url: paystackData.authorization_url,
      reference: paystackData.reference,
      orderReference,
      orderId: shopOrder.id,
    });
  } catch (error) {
    console.error('Shop checkout initialization failed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start checkout.' },
      { status: 500 }
    );
  }
}
