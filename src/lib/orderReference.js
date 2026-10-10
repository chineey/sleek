import crypto from 'crypto';

/**
 * Generate a short, unguessable 10-character alphanumeric order reference.
 * Uses an uppercase alphanumeric charset (32 chars, excluding confusing symbols).
 */
export function generateOrderReference(length = 10) {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
}
