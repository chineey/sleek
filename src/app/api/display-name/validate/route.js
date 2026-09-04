import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

const RESERVED_WORDS = ['admin', 'moderator', 'support', 'sleek'];
const MIN_LENGTH = 3;
const MAX_LENGTH = 12;

function validateDisplayName(name) {
  // Check length
  if (name.length < MIN_LENGTH) {
    return { valid: false, error: `Display name must be at least ${MIN_LENGTH} characters` };
  }
  if (name.length > MAX_LENGTH) {
    return { valid: false, error: `Display name must be at most ${MAX_LENGTH} characters` };
  }

  // Check allowed characters (alphanumeric and underscore only)
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    return { valid: false, error: 'Display name can only contain letters, numbers, and underscores' };
  }

  // Check for reserved words (case-insensitive, substring check)
  const lowerName = name.toLowerCase();
  for (const word of RESERVED_WORDS) {
    if (lowerName.includes(word)) {
      return { valid: false, error: `Display name cannot contain reserved word: "${word}"` };
    }
  }

  return { valid: true };
}

export async function POST(req) {
  try {
    const { displayName } = await req.json();

    if (!displayName) {
      return NextResponse.json({ valid: false, error: 'Display name is required' }, { status: 400 });
    }

    // Validate format
    const validation = validateDisplayName(displayName);
    if (!validation.valid) {
      return NextResponse.json(validation, { status: 400 });
    }

    // Check uniqueness (case-insensitive)
    const existing = await prisma.displayName.findUnique({
      where: { displayName: displayName.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { valid: false, error: 'Display name already taken' },
        { status: 409 }
      );
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error('Error validating display name:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
