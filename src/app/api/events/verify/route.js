import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { verifyTransaction } from '../../../../lib/paystack';
import { sendEventTicketEmail } from '../../../../lib/email';
import { generateOrderReference } from '../../../../lib/orderReference';
import { getBaseUrl } from '../../../../lib/url';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const reference = searchParams.get('reference') || searchParams.get('trxref');
  const nextAuthUrl = getBaseUrl(req);

  if (!reference) {
    return NextResponse.redirect(`${nextAuthUrl}/events?error=missing_reference`);
  }

  try {
    let ticket = await prisma.eventTicket.findUnique({
      where: { paystackReference: reference },
    });

    // Check if mock reference (for development)
    if (reference.startsWith('mock_event_')) {
      if (!ticket) {
        return NextResponse.redirect(`${nextAuthUrl}/events?error=ticket_not_found`);
      }
    } else {
      // Real Paystack verification
      const verificationData = await verifyTransaction(reference);
      if (verificationData.status !== 'success') {
        return NextResponse.redirect(`${nextAuthUrl}/events?error=payment_failed`);
      }

      const metadata = verificationData.metadata || {};

      if (!ticket && metadata.ticketReference) {
        ticket = await prisma.eventTicket.findUnique({
          where: { ticketReference: metadata.ticketReference },
        });
      }

      // If ticket record was not found in DB, recreate it from verified Paystack data
      if (!ticket) {
        const customerEmail = verificationData.customer?.email || metadata.email;
        const totalInNaira = metadata.totalPrice
          ? parseInt(metadata.totalPrice, 10)
          : Math.round((verificationData.amount || 0) / 100);
        const ticketRef = metadata.ticketReference || `SLK-TKT-${generateOrderReference(8)}`;
        const qty = parseInt(metadata.quantity, 10) || 1;
        const pricePerTicket = metadata.ticketPrice ? parseInt(metadata.ticketPrice, 10) : Math.round(totalInNaira / qty);

        let eventDetails = null;
        if (metadata.eventId) {
          eventDetails = await prisma.event.findUnique({ where: { id: metadata.eventId } });
        }

        ticket = await prisma.eventTicket.create({
          data: {
            ticketReference: ticketRef,
            email: customerEmail,
            eventId: metadata.eventId || eventDetails?.id || '',
            eventTitle: metadata.eventTitle || eventDetails?.title || 'SLEEK Event',
            eventDate: eventDetails?.date || new Date(),
            eventLocation: eventDetails?.location || 'SLEEK Venue',
            eventAddress: eventDetails?.address || 'Venue Location',
            ticketPrice: pricePerTicket,
            quantity: qty,
            totalPrice: totalInNaira,
            paystackReference: reference,
            status: 'paid',
            emailStatus: 'pending',
          },
        });
      }
    }

    // Fulfill ticket if not yet marked paid
    const wasAlreadyPaid = ticket.status === 'paid' || ticket.status === 'completed';
    const wasEmailSent = ticket.emailStatus === 'sent';

    if (!wasAlreadyPaid) {
      ticket = await prisma.eventTicket.update({
        where: { id: ticket.id },
        data: { status: 'paid' },
      });
    }

    // Send confirmation email if not sent yet
    if (!wasEmailSent) {
      let emailStatus = 'pending';
      let emailError = null;

      try {
        const emailRes = await sendEventTicketEmail({
          ticketReference: ticket.ticketReference,
          email: ticket.email,
          eventTitle: ticket.eventTitle,
          eventDate: ticket.eventDate,
          eventLocation: ticket.eventLocation,
          eventAddress: ticket.eventAddress,
          ticketPrice: ticket.ticketPrice,
          quantity: ticket.quantity,
          totalPrice: ticket.totalPrice,
        });

        emailStatus = emailRes?.ok ? 'sent' : 'failed';
      } catch (emailErr) {
        console.error('[EVENT VERIFY ERROR] Failed to send ticket confirmation email:', emailErr);
        emailStatus = 'failed';
        emailError = emailErr?.message || String(emailErr);
      }

      await prisma.eventTicket.update({
        where: { id: ticket.id },
        data: { emailStatus, emailError },
      });
    }

    return NextResponse.redirect(
      `${nextAuthUrl}/events?checkout=success&ticket=${encodeURIComponent(ticket.ticketReference)}`
    );
  } catch (error) {
    console.error('Error in events verify route:', error);
    return NextResponse.redirect(`${nextAuthUrl}/events?error=verification_failed`);
  }
}
