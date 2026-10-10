import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import prisma from '../../../../../lib/prisma';
import { sendOrderConfirmationEmail } from '../../../../../lib/email';

export const dynamic = 'force-dynamic';

export async function POST(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin session required.' },
        { status: 401 }
      );
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { error: 'Order ID is required.' },
        { status: 400 }
      );
    }

    const order = await prisma.shopOrder.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found.' },
        { status: 404 }
      );
    }

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
    } catch (err) {
      console.error(`[RESEND EMAIL ERROR] Failed to resend email for order #${order.orderReference}:`, err);
      emailStatus = 'failed';
      emailError = err.message || String(err);
    }

    const updatedOrder = await prisma.shopOrder.update({
      where: { id: order.id },
      data: {
        emailStatus,
        emailError,
      },
    });

    if (emailStatus === 'failed') {
      return NextResponse.json({
        success: false,
        message: `Email sending failed: ${emailError}`,
        order: updatedOrder,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Confirmation email resent to ${order.email}`,
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Error in resend-email route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to resend confirmation email.' },
      { status: 500 }
    );
  }
}
