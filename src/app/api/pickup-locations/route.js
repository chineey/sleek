import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import prisma from '../../../lib/prisma';

// GET all pickup locations sorted by order ascending
export async function GET() {
  try {
    const locations = await prisma.pickupLocation.findMany({
      orderBy: {
        order: 'asc',
      },
    });
    return NextResponse.json(locations);
  } catch (error) {
    console.error('Error fetching pickup locations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pickup locations.' },
      { status: 500 }
    );
  }
}

// POST a new pickup location (Admin only)
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin session required.' },
        { status: 401 }
      );
    }

    const { name, address, openingHours, latitude, longitude, active } = await req.json();

    if (!name || !address || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'Name, address, latitude, and longitude are required.' },
        { status: 400 }
      );
    }

    // Validate latitude and longitude
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: 'Invalid latitude or longitude. Latitude must be between -90 and 90, longitude between -180 and 180.' },
        { status: 400 }
      );
    }

    // Determine the highest order number
    const lastLocation = await prisma.pickupLocation.findFirst({
      orderBy: {
        order: 'desc',
      },
    });
    const nextOrder = lastLocation ? lastLocation.order + 1 : 0;

    const newLocation = await prisma.pickupLocation.create({
      data: {
        name,
        address,
        openingHours: openingHours || 'Mon - Sat: 9:00 AM - 6:00 PM',
        latitude: lat,
        longitude: lng,
        active: active !== false,
        order: nextOrder,
      },
    });

    return NextResponse.json(newLocation, { status: 201 });
  } catch (error) {
    console.error('Error creating pickup location:', error);
    return NextResponse.json(
      { error: 'Failed to create pickup location.' },
      { status: 500 }
    );
  }
}

// PUT/update an existing pickup location (Admin only)
export async function PUT(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin session required.' },
        { status: 401 }
      );
    }

    const { id, name, address, openingHours, latitude, longitude, active } = await req.json();

    if (!id || !name || !address || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'Id, name, address, latitude, and longitude are required.' },
        { status: 400 }
      );
    }

    // Validate latitude and longitude
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: 'Invalid latitude or longitude. Latitude must be between -90 and 90, longitude between -180 and 180.' },
        { status: 400 }
      );
    }

    const updatedLocation = await prisma.pickupLocation.update({
      where: { id },
      data: {
        name,
        address,
        openingHours: openingHours || 'Mon - Sat: 9:00 AM - 6:00 PM',
        latitude: lat,
        longitude: lng,
        active: active !== false,
      },
    });

    return NextResponse.json(updatedLocation);
  } catch (error) {
    console.error('Error updating pickup location:', error);
    return NextResponse.json(
      { error: 'Failed to update pickup location.' },
      { status: 500 }
    );
  }
}

// DELETE an existing pickup location (Admin only)
export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin session required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Pickup location ID is required.' },
        { status: 400 }
      );
    }

    const deletedLocation = await prisma.pickupLocation.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Pickup location deleted successfully.', deletedLocation });
  } catch (error) {
    console.error('Error deleting pickup location:', error);
    return NextResponse.json(
      { error: 'Failed to delete pickup location.' },
      { status: 500 }
    );
  }
}

// PATCH/reorder pickup locations in bulk (Admin only)
export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin session required.' },
        { status: 401 }
      );
    }

    const { orders } = await req.json(); // Array of { id, order }

    if (!orders || !Array.isArray(orders)) {
      return NextResponse.json(
        { error: 'Invalid orders data. Array required.' },
        { status: 400 }
      );
    }

    // Run order updates as a single atomic transaction
    await prisma.$transaction(
      orders.map((o) =>
        prisma.pickupLocation.update({
          where: { id: o.id },
          data: { order: parseInt(o.order) },
        })
      )
    );

    return NextResponse.json({ message: 'Pickup locations order saved successfully.' });
  } catch (error) {
    console.error('Error updating pickup locations order:', error);
    return NextResponse.json(
      { error: 'Failed to update pickup locations order.' },
      { status: 500 }
    );
  }
}
