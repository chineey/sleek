import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { initializeTransaction } from '../../../../lib/paystack';

export async function POST(req) {
  try {
    const { productId, email } = await req.json();

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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const callbackUrl = `${appUrl}/shop?checkout=success`;
    const paystackData = await initializeTransaction({
      email,
      amount: product.price * 100,
      callbackUrl,
      metadata: {
        productId: product.id,
        productName: product.name,
        type: 'shop_order',
      },
    });

    return NextResponse.json({
      authorization_url: paystackData.authorization_url,
      reference: paystackData.reference,
      product,
    });
  } catch (error) {
    console.error('Shop checkout initialization failed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start checkout.' },
      { status: 500 }
    );
  }
}
