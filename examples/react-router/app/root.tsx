import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router'

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body style={{ maxWidth: '48rem', margin: '0 auto', padding: '2rem', fontFamily: 'system-ui, sans-serif', lineHeight: 1.6 }}>
        <nav style={{ marginBottom: '1rem' }}>
          <a href="/">Home</a>
        </nav>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  return <Outlet />
}
