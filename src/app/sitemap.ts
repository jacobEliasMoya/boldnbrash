import type { MetadataRoute } from 'next'
import { siteUrl } from './(frontend)/siteMetadata'

export default function sitemap(): MetadataRoute.Sitemap {
  return siteUrl ? [{ url: siteUrl.href }] : []
}
