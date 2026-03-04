import { VisualEditing } from 'next-sanity/visual-editing'
import { draftMode } from 'next/headers'
import { SanityLive } from '@/lib/live'

export const metadata = {
  title: 'URL Resolution POC',
  description: 'Proving two-tier URL resolution for Sanity structured content',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <SanityLive />
        {(await draftMode()).isEnabled && <VisualEditing />}
      </body>
    </html>
  )
}
