import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import prisma from '../../../lib/prisma';

// GET all events
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get('all') === 'true';

    const session = await getServerSession(authOptions);
    const where = (!session && !includeInactive) ? { active: true } : {};

    const events = await prisma.event.findMany({
      where,
      orderBy: [
        { date: 'asc' },
        { order: 'asc' }
      ],
      include: {
        ratings: {
          select: {
            rating: true,
          },
        },
        _count: {
          select: {
            comments: true,
            ratings: true,
          },
        },
      },
    });

    const eventsWithStats = events.map((event) => {
      const totalRatings = event.ratings.length;
      const sumRatings = event.ratings.reduce((acc, r) => acc + r.rating, 0);
      const averageRating = totalRatings > 0 ? (sumRatings / totalRatings).toFixed(1) : null;

      // Remove the full ratings array from response to reduce payload size
      const { ratings, ...rest } = event;

      return {
        ...rest,
        averageRating: averageRating ? parseFloat(averageRating) : null,
        ratingsCount: totalRatings,
        commentsCount: event._count.comments,
      };
    });

    return NextResponse.json(eventsWithStats);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Failed to fetch events.' }, { status: 500 });
  }
}

// POST create a new event (Admin only)
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 });
    }

    const { title, description, date, location, address, latitude, longitude, image, hasTickets, ticketPrice, active } = await req.json();

    if (!title || !description || !date || !location || !address) {
      return NextResponse.json(
        { error: 'Title, description, date, location, and address are required.' },
        { status: 400 }
      );
    }

    const defaultEventImage = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200&auto=format&fit=crop';

    const lastEvent = await prisma.event.findFirst({
      orderBy: { order: 'desc' },
    });
    const nextOrder = lastEvent ? lastEvent.order + 1 : 0;

    const latNum = (latitude !== undefined && latitude !== null && latitude !== '') ? parseFloat(latitude) : null;
    const lngNum = (longitude !== undefined && longitude !== null && longitude !== '') ? parseFloat(longitude) : null;
    const priceNum = (ticketPrice !== undefined && ticketPrice !== null && ticketPrice !== '') ? parseInt(ticketPrice, 10) : 5000;
    const isTicketsEnabled = hasTickets === true || hasTickets === 'true';

    const event = await prisma.event.create({
      data: {
        title,
        description,
        date: new Date(date),
        location,
        address,
        latitude: latNum != null && !isNaN(latNum) ? latNum : null,
        longitude: lngNum != null && !isNaN(lngNum) ? lngNum : null,
        hasTickets: isTicketsEnabled,
        ticketPrice: !isNaN(priceNum) ? priceNum : 5000,
        image: image || defaultEventImage,
        active: active !== false,
        order: nextOrder,
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json({ error: error.message || 'Failed to create event.' }, { status: 500 });
  }
}

// PUT update an event (Admin only)
export async function PUT(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 });
    }

    const { id, title, description, date, location, address, latitude, longitude, image, hasTickets, ticketPrice, active } = await req.json();

    if (!id || !title || !description || !date || !location || !address) {
      return NextResponse.json(
        { error: 'ID, title, description, date, location, and address are required.' },
        { status: 400 }
      );
    }

    const latNum = (latitude !== undefined && latitude !== null && latitude !== '') ? parseFloat(latitude) : null;
    const lngNum = (longitude !== undefined && longitude !== null && longitude !== '') ? parseFloat(longitude) : null;
    const priceNum = (ticketPrice !== undefined && ticketPrice !== null && ticketPrice !== '') ? parseInt(ticketPrice, 10) : undefined;

    const updated = await prisma.event.update({
      where: { id },
      data: {
        title,
        description,
        date: new Date(date),
        location,
        address,
        latitude: latNum != null && !isNaN(latNum) ? latNum : null,
        longitude: lngNum != null && !isNaN(lngNum) ? lngNum : null,
        ...(hasTickets !== undefined ? { hasTickets: hasTickets === true || hasTickets === 'true' } : {}),
        ...(priceNum !== undefined && !isNaN(priceNum) ? { ticketPrice: priceNum } : {}),
        ...(image ? { image } : {}),
        active: active !== false,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json({ error: error.message || 'Failed to update event.' }, { status: 500 });
  }
}

// DELETE an event (Admin only)
export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Event ID is required.' }, { status: 400 });
    }

    const deleted = await prisma.event.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Event deleted successfully.', deleted });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: 'Failed to delete event.' }, { status: 500 });
  }
}
