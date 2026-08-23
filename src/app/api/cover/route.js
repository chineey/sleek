import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import prisma from '../../../lib/prisma';

export const dynamic = 'force-dynamic';

// GET cover settings (Public)
export async function GET() {
  try {
    let settings = await prisma.coverSettings.findUnique({
      where: { id: 1 },
    });
    
    if (!settings) {
      // Create defaults on first fetch if empty
      settings = await prisma.coverSettings.create({
        data: {
          id: 1,
          title: "SLEEK",
          issue: "ISH. 01",
          label: "MAGAZINE",
          tagline: "A New WAVE",
          url: "www.sleekmagazine.com",
          social: "@sleekpeak",
          image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1200&auto=format&fit=crop",
        }
      });
    }
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching cover settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cover settings.' },
      { status: 500 }
    );
  }
}

// PUT cover settings (Admin only)
export async function PUT(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin session required.' },
        { status: 401 }
      );
    }

    const { title, issue, label, tagline, url, social, image } = await req.json();

    const updated = await prisma.coverSettings.upsert({
      where: { id: 1 },
      update: {
        title: title !== undefined ? title : "",
        issue: issue !== undefined ? issue : "",
        label: label !== undefined ? label : "",
        tagline: tagline !== undefined ? tagline : "",
        url: url !== undefined ? url : "",
        social: social !== undefined ? social : "",
        image: image || "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1200&auto=format&fit=crop",
      },
      create: {
        id: 1,
        title: title !== undefined ? title : "",
        issue: issue !== undefined ? issue : "",
        label: label !== undefined ? label : "",
        tagline: tagline !== undefined ? tagline : "",
        url: url !== undefined ? url : "",
        social: social !== undefined ? social : "",
        image: image || "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1200&auto=format&fit=crop",
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error saving cover settings:', error);
    return NextResponse.json(
      { error: 'Failed to save cover settings.' },
      { status: 500 }
    );
  }
}
