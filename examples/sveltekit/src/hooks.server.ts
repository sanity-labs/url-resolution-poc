import { redirect, type Handle } from '@sveltejs/kit'
import { getRedirects } from '@sanity/routes'
import { client } from '$lib/sanity'

export const handle: Handle = async ({ event, resolve }) => {
  const redirects = await getRedirects(client, { cacheTtl: 60_000 })
  const match = redirects.find((r) => r.source === event.url.pathname)

  if (match) {
    redirect(match.statusCode, match.destination)
  }

  return resolve(event)
}
