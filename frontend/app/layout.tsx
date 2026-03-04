export const metadata = {
  title: 'URL Resolution POC',
  description: 'Proving two-tier URL resolution for Sanity structured content',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
