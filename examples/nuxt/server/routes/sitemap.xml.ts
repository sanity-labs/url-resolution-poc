import { useRouteResolver } from '../utils/routes'

export default defineEventHandler(async (event) => {
  const resolver = useRouteResolver()
  const urlMap = await resolver.preload()

  const entries = Object.values(urlMap)
    .map(
      (url) => `  <url>
    <loc>${url}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
    )
    .join('\n')

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`

  setHeader(event, 'Content-Type', 'application/xml')
  setHeader(event, 'Cache-Control', 'max-age=3600')
  return sitemap
})
