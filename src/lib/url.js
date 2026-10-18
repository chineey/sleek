/**
 * Helper to get the canonical base URL for the application.
 * Automatically resolves to the custom domain (https://sleekmagazine.ng)
 * in production or when an old Vercel URL was configured in environment variables.
 */
export function getBaseUrl(req) {
  if (req) {
    try {
      const host = req.headers?.get?.('x-forwarded-host') || req.headers?.get?.('host');
      const proto = req.headers?.get?.('x-forwarded-proto') || 'https';
      if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
        if (host.includes('vercel.app')) {
          return 'https://sleekmagazine.ng';
        }
        return `${proto}://${host}`.replace(/\/+$/, '');
      }
    } catch {}
  }

  // 1. Explicit domain configuration in env
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (siteUrl && !siteUrl.includes('vercel.app')) {
    return siteUrl.replace(/\/+$/, '');
  }

  // 2. Check NEXTAUTH_URL
  const nextAuthUrl = process.env.NEXTAUTH_URL?.trim();
  if (nextAuthUrl) {
    // If NEXTAUTH_URL has vercel.app, automatically rewrite to custom domain
    if (nextAuthUrl.includes('vercel.app')) {
      return 'https://sleekmagazine.ng';
    }
    if (!nextAuthUrl.includes('localhost') && !nextAuthUrl.includes('127.0.0.1')) {
      return nextAuthUrl.replace(/\/+$/, '');
    }
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      return 'https://sleekmagazine.ng';
    }
    return nextAuthUrl.replace(/\/+$/, '');
  }

  // 3. In production environments, use sleekmagazine.ng
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    return 'https://sleekmagazine.ng';
  }

  return 'http://localhost:3000';
}
