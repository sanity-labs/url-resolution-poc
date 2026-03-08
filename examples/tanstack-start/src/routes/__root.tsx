import {
  createRootRoute,
  HeadContent,
  Outlet,
  redirect,
  Scripts,
} from '@tanstack/react-router'
import { checkRedirect } from '~/lib/server-fns'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'URL Resolution POC — TanStack Start' },
    ],
  }),
  beforeLoad: async ({ location }) => {
    const match = await checkRedirect({ data: location.pathname })
    if (match) {
      throw redirect({
        href: match.destination,
        statusCode: match.statusCode,
      })
    }
  },
  component: RootDocument,
})

function RootDocument() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <nav>
          <a href="/">Home</a>
        </nav>
        <main>
          <Outlet />
        </main>
        <Scripts />
      </body>
    </html>
  )
}
