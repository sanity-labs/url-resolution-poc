import { PortableText } from '@portabletext/react'

interface Props {
  value: any
  urlMap: Record<string, string>
}

/**
 * Portable Text renderer with internal link resolution.
 *
 * Uses a pre-loaded URL map (plain object) for synchronous link resolution.
 * The urlMap is a Record<string, string> (not Map) because React Router
 * serializes loader data as JSON.
 */
export function PortableTextBody({ value, urlMap }: Props) {
  if (!value) return null

  return (
    <PortableText
      value={value}
      components={{
        marks: {
          internalLink: ({ value: mark, children }) => {
            const url = mark?.reference ? urlMap[mark.reference._ref] : undefined
            const href = url ? (() => { try { return new URL(url).pathname } catch { return url } })() : '#'
            return url ? <a href={href}>{children}</a> : <span>{children}</span>
          },
        },
      }}
    />
  )
}
