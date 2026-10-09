import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import prisma from '../../../lib/prisma';

const slugify = (value = '') =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'product';

const normalizePrice = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed));
};

const normalizeStock = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed));
};

const getUniqueSlug = async (baseSlug) => {
  const slugRoot = baseSlug || 'product';
  let slug = slugRoot;
  let counter = 1;

  while (await prisma.product.findUnique({ where: { slug } })) {
    slug = `${slugRoot}-${counter}`;
    counter += 1;
  }

  return slug;
};

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products.' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin session required.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      name,
      description,
      image,
      category,
      price,
      stock,
      active,
      slug,
    } = body;

    if (!name || !description || !image) {
      return NextResponse.json(
        { error: 'Name, description, and image are required.' },
        { status: 400 }
      );
    }

    const productSlug = await getUniqueSlug(slugify(slug || name));

    const product = await prisma.product.create({
      data: {
        name,
        slug: productSlug,
        description,
        image,
        category: category || 'Accessories',
        price: normalizePrice(price),
        stock: normalizeStock(stock),
        active: active !== false,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product.' },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin session required.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { id, name, description, image, category, price, stock, active, slug } = body;

    if (!id || !name || !description || !image) {
      return NextResponse.json(
        { error: 'Product ID, name, description, and image are required.' },
        { status: 400 }
      );
    }

    const productSlug = await getUniqueSlug(slugify(slug || name));

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        slug: productSlug,
        description,
        image,
        category: category || 'Accessories',
        price: normalizePrice(price),
        stock: normalizeStock(stock),
        active: active !== false,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product.' },
      { status: 500 }
    );
  }
}

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
        { error: 'Product ID is required.' },
        { status: 400 }
      );
    }

    const deletedProduct = await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Product deleted successfully.', deletedProduct });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product.' },
      { status: 500 }
    );
  }
}
