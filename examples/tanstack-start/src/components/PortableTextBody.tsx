import { PortableText, type PortableTextBlock } from '@portabletext/react'
import { getPath } from '@sanity/routes'

interface Props {
  value: PortableTextBlock[]
  urlMap: Record<string, string>
}

/**
 * Portable Text renderer with internal link resolution.
 *
 * Uses a pre-loaded URL map (Record) for synchronous link resolution.
 * TanStack Start uses a custom serializer that doesn't support Map,
 * so Record<string, string> is the correct type here.
 */
export function PortableTextBody({ value, urlMap }: Props) {
  if (!value) return null

  return (
    <PortableText
      value={value}
      components={{
        marks: {
          internalLink: ({ value: mark, children }) => {
            const url = mark?.reference
              ? urlMap[mark.reference._ref]
              : undefined
            const href = url ? (getPath(url) ?? url) : '#'
            return url ? <a href={href}>{children}</a> : <span>{children}</span>
          },
        },
      }}
    />
  )
}
