import type { MetadataRoute } from 'next'

const BASE_URL = 'https://www.coconect.io'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/feed/',
        '/admin/',
        '/onboarding/',
        '/checkout/',
        '/feedback/',
        '/profile/',
        '/registration/',
        '/linkedin/',
        '/mockfeed/',
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  }
}
