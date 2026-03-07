import type { EntryContext } from 'react-router'
import { ServerRouter } from 'react-router'
import { renderToString } from 'react-dom/server'
import { getRedirects } from '@sanity/routes'
import { client } from '~/lib/sanity.server'

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
) {
  // Check for redirects
  const url = new URL(request.url)
  const redirects = await getRedirects(client, { cacheTtl: 60_000 })
  const match = redirects.find((r) => r.source === url.pathname)

  if (match) {
    return new Response(null, {
      status: match.statusCode,
      headers: { Location: match.destination },
    })
  }

  const html = renderToString(
    <ServerRouter context={routerContext} url={request.url} />,
  )

  responseHeaders.set('Content-Type', 'text/html')

  return new Response(`<!DOCTYPE html>${html}`, {
    status: responseStatusCode,
    headers: responseHeaders,
  })
}
