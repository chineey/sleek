import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import prisma from '../../../../../lib/prisma';
import { sendEventTicketEmail } from '../../../../../lib/email';

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
        { error: 'Ticket ID is required.' },
        { status: 400 }
      );
    }

    const ticket = await prisma.eventTicket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found.' },
        { status: 404 }
      );
    }

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
    } catch (err) {
      console.error('[ADMIN RESEND TICKET EMAIL] Error:', err);
      emailStatus = 'failed';
      emailError = err?.message || String(err);
    }

    const updatedTicket = await prisma.eventTicket.update({
      where: { id },
      data: {
        emailStatus,
        emailError,
      },
    });

    if (emailStatus === 'sent') {
      return NextResponse.json({
        success: true,
        message: `Ticket confirmation email resent to ${ticket.email}.`,
        ticket: updatedTicket,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: `Failed to resend email: ${emailError || 'Unknown error'}`,
          ticket: updatedTicket,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error resending ticket email:', error);
    return NextResponse.json(
      { error: 'Server error processing resend request.' },
      { status: 500 }
    );
  }
}
