import { resolver } from '@/lib/routes'
import type { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const urlMap: Map<string, string> = await resolver.preload()
  const entries: MetadataRoute.Sitemap = []

  urlMap.forEach((url: string) => {
    entries.push({
      url,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })
  })

  return entries
}
