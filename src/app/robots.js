export default function robots() {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://sleekmagazine.ng').replace(/\/+$/, '');

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/api',
          '/api/',
          '/login',
          '/subscriber',
          '/subscriber/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
