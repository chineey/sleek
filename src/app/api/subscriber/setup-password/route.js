import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { verifySubscriberToken } from '../../../../lib/subscriberToken';
import bcrypt from 'bcryptjs';

const RESERVED_WORDS = ['admin', 'moderator', 'support', 'sleek'];
const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 12;
const MIN_PASSWORD_LENGTH = 6;

function validateDisplayName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Display name is required.' };
  }
  const trimmed = name.trim();
  if (trimmed.length < MIN_NAME_LENGTH) {
    return { valid: false, error: `Display name must be at least ${MIN_NAME_LENGTH} characters.` };
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    return { valid: false, error: `Display name must be at most ${MAX_NAME_LENGTH} characters.` };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return { valid: false, error: 'Display name can only contain letters, numbers, and underscores.' };
  }
  const lower = trimmed.toLowerCase();
  for (const word of RESERVED_WORDS) {
    if (lower.includes(word)) {
      return { valid: false, error: `Display name cannot contain reserved term "${word}".` };
    }
  }
  return { valid: true, cleanName: trimmed };
}

export async function POST(req) {
  try {
    const token = req.cookies.get('subscriber_token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized. You must have an active subscriber session to set up your password.' },
        { status: 401 }
      );
    }

    const payload = verifySubscriberToken(token);
    if (!payload?.email) {
      return NextResponse.json(
        { error: 'Invalid or expired session. Please sign in again.' },
        { status: 401 }
      );
    }

    const subscriber = await prisma.subscriber.findUnique({
      where: { email: payload.email }
    });

    if (!subscriber || subscriber.status !== 'active') {
      return NextResponse.json(
        { error: 'Active subscriber account required.' },
        { status: 403 }
      );
    }

    const { displayName, password } = await req.json();

    // Validate display name
    const nameValidation = validateDisplayName(displayName);
    if (!nameValidation.valid) {
      return NextResponse.json({ error: nameValidation.error }, { status: 400 });
    }

    // Validate password
    if (!password || typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
        { status: 400 }
      );
    }

    const lowerName = nameValidation.cleanName.toLowerCase();

    // Check if display name is taken by another subscriber
    const existingName = await prisma.displayName.findUnique({
      where: { displayName: lowerName }
    });

    if (existingName && existingName.subscriberId !== subscriber.id) {
      return NextResponse.json(
        { error: 'This display name is already taken. Please choose another.' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update subscriber password
    await prisma.subscriber.update({
      where: { id: subscriber.id },
      data: { password: hashedPassword }
    });

    // Upsert display name
    await prisma.displayName.upsert({
      where: { subscriberId: subscriber.id },
      update: { displayName: lowerName },
      create: {
        subscriberId: subscriber.id,
        displayName: lowerName
      }
    });

    return NextResponse.json({
      success: true,
      displayName: lowerName,
      message: 'Password and display name set successfully.'
    });
  } catch (error) {
    console.error('[SUBSCRIBER SETUP] Error setting password and display name:', error);
    return NextResponse.json(
      { error: 'Failed to complete setup. Please try again.' },
      { status: 500 }
    );
  }
}
