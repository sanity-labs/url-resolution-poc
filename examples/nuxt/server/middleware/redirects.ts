import { getRedirects } from '@sanity/routes'
import { useSanityClient } from '../utils/sanity'

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  const client = useSanityClient()
  const redirects = await getRedirects(client, { cacheTtl: 60_000 })
  const match = redirects.find((r) => r.source === url.pathname)

  if (match) {
    return sendRedirect(event, match.destination, match.statusCode)
  }
})
