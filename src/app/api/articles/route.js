import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import prisma from '../../../lib/prisma';

// GET all articles sorted by order ascending
export async function GET() {
  try {
    const articles = await prisma.article.findMany({
      orderBy: {
        order: 'asc',
      },
    });
    return NextResponse.json(articles);
  } catch (error) {
    console.error('Error fetching articles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch articles.' },
      { status: 500 }
    );
  }
}

// POST a new article (Admin only)
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin session required.' },
        { status: 401 }
      );
    }

    const { title, category, author, date, image, content } = await req.json();

    if (!title || !category || !author || !date || !image || !content) {
      return NextResponse.json(
        { error: 'All fields are required.' },
        { status: 400 }
      );
    }

    // Determine the highest order number in the DB to place new article at the end
    const lastArticle = await prisma.article.findFirst({
      orderBy: {
        order: 'desc',
      },
    });
    const nextOrder = lastArticle ? lastArticle.order + 1 : 0;

    const newArticle = await prisma.article.create({
      data: {
        title,
        category,
        author,
        date,
        image,
        content,
        order: nextOrder,
      },
    });

    return NextResponse.json(newArticle, { status: 201 });
  } catch (error) {
    console.error('Error creating article:', error);
    return NextResponse.json(
      { error: 'Failed to create article.' },
      { status: 500 }
    );
  }
}

// PUT/update an existing article (Admin only)
export async function PUT(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin session required.' },
        { status: 401 }
      );
    }

    const { id, title, category, author, date, image, content } = await req.json();

    if (!id || !title || !category || !author || !date || !image || !content) {
      return NextResponse.json(
        { error: 'All fields are required.' },
        { status: 400 }
      );
    }

    const updatedArticle = await prisma.article.update({
      where: { id: parseInt(id) },
      data: {
        title,
        category,
        author,
        date,
        image,
        content,
      },
    });

    return NextResponse.json(updatedArticle);
  } catch (error) {
    console.error('Error updating article:', error);
    return NextResponse.json(
      { error: 'Failed to update article.' },
      { status: 500 }
    );
  }
}

// DELETE an existing article (Admin only)
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
        { error: 'Article ID is required.' },
        { status: 400 }
      );
    }

    const deletedArticle = await prisma.article.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ message: 'Article deleted successfully.', deletedArticle });
  } catch (error) {
    console.error('Error deleting article:', error);
    return NextResponse.json(
      { error: 'Failed to delete article.' },
      { status: 500 }
    );
  }
}

// PATCH/reorder articles in bulk (Admin only)
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
        prisma.article.update({
          where: { id: parseInt(o.id) },
          data: { order: parseInt(o.order) },
        })
      )
    );

    return NextResponse.json({ message: 'Ordering layout saved successfully.' });
  } catch (error) {
    console.error('Error updating articles layout order:', error);
    return NextResponse.json(
      { error: 'Failed to update articles layout order.' },
      { status: 500 }
    );
  }
}
