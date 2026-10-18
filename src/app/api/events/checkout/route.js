import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { initializeTransaction } from '../../../../lib/paystack';
import { generateOrderReference } from '../../../../lib/orderReference';
import { getBaseUrl } from '../../../../lib/url';

export async function POST(req) {
  try {
    const { eventId, email, quantity = 1 } = await req.json();

    if (!eventId || !email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'A valid event and email are required.' },
        { status: 400 }
      );
    }

    const qty = Math.max(1, parseInt(quantity, 10) || 1);

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event || !event.active) {
      return NextResponse.json(
        { error: 'This event is unavailable or inactive.' },
        { status: 404 }
      );
    }

    if (!event.hasTickets) {
      return NextResponse.json(
        { error: 'Tickets are not on sale for this event.' },
        { status: 400 }
      );
    }

    // Check if event date has passed
    if (new Date(event.date) < new Date()) {
      return NextResponse.json(
        { error: 'Ticket sales have closed for this event.' },
        { status: 400 }
      );
    }

    const ticketPrice = event.ticketPrice !== undefined && event.ticketPrice !== null ? event.ticketPrice : 5000;
    const totalPrice = ticketPrice * qty;
    const ticketReference = `SLK-TKT-${generateOrderReference(8)}`;
    const nextAuthUrl = getBaseUrl(req);

    const isPaystackKeyConfigured =
      process.env.PAYSTACK_SECRET_KEY &&
      !process.env.PAYSTACK_SECRET_KEY.includes('your-') &&
      !process.env.PAYSTACK_SECRET_KEY.includes('sk_test_xxx') &&
      process.env.PAYSTACK_SECRET_KEY.trim() !== '';

    if (!isPaystackKeyConfigured) {
      console.log('[PAYSTACK EVENTS] Secret key not configured. Generating mock checkout redirect.');
      const mockReference = `mock_event_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      const ticketRecord = await prisma.eventTicket.create({
        data: {
          ticketReference,
          email,
          eventId: event.id,
          eventTitle: event.title,
          eventDate: event.date,
          eventLocation: event.location,
          eventAddress: event.address,
          ticketPrice,
          quantity: qty,
          totalPrice,
          paystackReference: mockReference,
          status: 'pending',
          emailStatus: 'pending',
        },
      });

      const mockCheckoutUrl = `${nextAuthUrl}/api/events/verify?reference=${mockReference}&ticket=${ticketReference}`;
      return NextResponse.json({
        authorization_url: mockCheckoutUrl,
        reference: mockReference,
        ticketReference,
        ticketId: ticketRecord.id,
        mock: true,
      });
    }

    const callbackUrl = `${nextAuthUrl}/api/events/verify`;

    const paystackData = await initializeTransaction({
      email,
      amount: totalPrice * 100, // in kobo
      callbackUrl,
      metadata: {
        payment_type: 'event_ticket',
        ticketReference,
        eventId: event.id,
        eventTitle: event.title,
        ticketPrice,
        quantity: qty,
        totalPrice,
        email,
      },
    });

    const ticketRecord = await prisma.eventTicket.create({
      data: {
        ticketReference,
        email,
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.date,
        eventLocation: event.location,
        eventAddress: event.address,
        ticketPrice,
        quantity: qty,
        totalPrice,
        paystackReference: paystackData.reference,
        status: 'pending',
        emailStatus: 'pending',
      },
    });

    return NextResponse.json({
      authorization_url: paystackData.authorization_url,
      reference: paystackData.reference,
      ticketReference,
      ticketId: ticketRecord.id,
    });
  } catch (error) {
    console.error('Event ticket checkout initialization failed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start ticket checkout.' },
      { status: 500 }
    );
  }
}
