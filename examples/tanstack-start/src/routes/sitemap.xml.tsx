import { createFileRoute } from '@tanstack/react-router'
import { fetchSitemapUrls } from '~/lib/server-fns'

// API route — returns XML response, no component
export const Route = createFileRoute('/sitemap/xml')(
  {
    loader: async () => {
      const urls = await fetchSitemapUrls()

      const entries = urls
        .map(
          (url) => `  <url>
    <loc>${url}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
        )
        .join('\n')

      return {
        urls,
        xml: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`,
      }
    },
    component: Sitemap,
  },
)

function Sitemap() {
  const { urls } = Route.useLoaderData()

  return (
    <>
      <h1>Sitemap</h1>
      <p>{urls.length} URLs indexed</p>
      <ul>
        {urls.map((url) => (
          <li key={url}>
            <a href={url}>{url}</a>
          </li>
        ))}
      </ul>
    </>
  )
}
