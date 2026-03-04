import { VisualEditing } from 'next-sanity'
import { draftMode } from 'next/headers'

export const metadata = {
  title: 'URL Resolution POC',
  description: 'Proving two-tier URL resolution for Sanity structured content',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const draft = await draftMode()
  return (
    <html lang="en">
      <body>
        {children}
        {draft.isEnabled && <VisualEditing />}
      </body>
    </html>
  )
}
