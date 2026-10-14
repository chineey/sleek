import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '../../../../../lib/prisma';

export async function POST(req, { params }) {
  try {
    const { id: eventId } = params;
    const { rating } = await req.json();

    const ratingNum = parseInt(rating, 10);
    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json(
        { error: 'Rating must be an integer between 1 and 5 stars.' },
        { status: 400 }
      );
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
    }

    // Party time check: users can only rate AFTER party time and date
    const now = new Date();
    const eventDate = new Date(event.date);

    if (now < eventDate) {
      return NextResponse.json(
        { error: 'Rating is only open after the event takes place.' },
        { status: 403 }
      );
    }

    // Generate IP hash to prevent duplicate submissions from the same client
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown-client';
    const ipHash = crypto.createHash('sha256').update(ip + eventId).digest('hex');

    // Check if user already rated this event with this IP hash
    const existingRating = await prisma.eventRating.findFirst({
      where: {
        eventId,
        ipHash,
      },
    });

    if (existingRating) {
      // Update existing rating instead of creating duplicate
      await prisma.eventRating.update({
        where: { id: existingRating.id },
        data: { rating: ratingNum },
      });
    } else {
      await prisma.eventRating.create({
        data: {
          eventId,
          rating: ratingNum,
          ipHash,
        },
      });
    }

    // Recalculate average rating
    const allRatings = await prisma.eventRating.findMany({
      where: { eventId },
      select: { rating: true },
    });

    const total = allRatings.length;
    const sum = allRatings.reduce((acc, r) => acc + r.rating, 0);
    const average = total > 0 ? parseFloat((sum / total).toFixed(1)) : ratingNum;

    return NextResponse.json({
      success: true,
      userRating: ratingNum,
      averageRating: average,
      ratingsCount: total,
      message: 'Thank you for rating the event!',
    });
  } catch (error) {
    console.error('Error rating event:', error);
    return NextResponse.json({ error: 'Failed to submit rating.' }, { status: 500 });
  }
}
