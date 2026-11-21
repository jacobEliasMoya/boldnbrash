import type { MetadataRoute } from 'next'
import { siteUrl } from './(frontend)/siteMetadata'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/my-route'] },
    sitemap: siteUrl ? new URL('/sitemap.xml', siteUrl).href : undefined,
  }
}
