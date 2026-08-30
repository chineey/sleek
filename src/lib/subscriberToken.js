import crypto from 'crypto';

const SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret-for-subscribers';

export function createSubscriberToken(email) {
  // Token expires in 30 days
  const expires = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const payload = `${email}:${expires}`;
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(payload)
    .digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64');
}

export function verifySubscriberToken(tokenStr) {
  if (!tokenStr) return null;
  try {
    const decoded = Buffer.from(tokenStr, 'base64').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length !== 3) return null;
    const [email, expiresStr, signature] = parts;
    const expires = parseInt(expiresStr, 10);
    if (Date.now() > expires) return null; // Expired
    
    // Verify signature
    const payload = `${email}:${expires}`;
    const expectedSignature = crypto
      .createHmac('sha256', SECRET)
      .update(payload)
      .digest('hex');
    
    if (signature !== expectedSignature) return null;
    return { email };
  } catch (err) {
    return null;
  }
}
