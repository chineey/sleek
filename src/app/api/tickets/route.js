import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import prisma from '../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin session required.' },
        { status: 401 }
      );
    }

    const tickets = await prisma.eventTicket.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        event: {
          select: {
            title: true,
            date: true,
            location: true,
          },
        },
      },
    });

    return NextResponse.json(tickets);
  } catch (error) {
    console.error('Error fetching event tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets.' },
      { status: 500 }
    );
  }
}
