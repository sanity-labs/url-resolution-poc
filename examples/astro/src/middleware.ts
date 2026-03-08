import { defineMiddleware } from 'astro:middleware'
import { getRedirects } from '@sanity/routes'
import { authenticatedClient } from './lib/sanity'

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url)
  const redirects = await getRedirects(authenticatedClient, { cacheTtl: 60_000 })
  const match = redirects.find((r) => r.source === url.pathname)

  if (match) {
    return context.redirect(match.destination, match.statusCode)
  }

  return next()
})
