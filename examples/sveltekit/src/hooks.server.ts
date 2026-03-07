import { redirect, type Handle } from '@sveltejs/kit'
import { getRedirects } from '@sanity/routes'
import { client } from '$lib/sanity'

// Cache redirects in memory — refresh every 60 seconds
let redirectMap: Map<string, { destination: string; statusCode: number }> | null = null
let lastFetch = 0
const CACHE_TTL = 60_000

async function getRedirectMap() {
  if (redirectMap && Date.now() - lastFetch < CACHE_TTL) return redirectMap

  const redirects = await getRedirects(client)
  redirectMap = new Map()
  for (const r of redirects) {
    redirectMap.set(r.source, { destination: r.destination, statusCode: r.statusCode })
  }
  lastFetch = Date.now()
  return redirectMap
}

export const handle: Handle = async ({ event, resolve }) => {
  const path = event.url.pathname

  // Check for redirects
  const redirects = await getRedirectMap()
  const match = redirects.get(path)
  if (match) {
    redirect(match.statusCode, match.destination)
  }

  return resolve(event)
}
