import { PortableText } from '@portabletext/react'
import { CodeBlock } from './CodeBlock'

interface Props {
  value: any
  urlMap: Map<string, string>
}

/**
 * Shared Portable Text renderer with internal link resolution.
 *
 * Uses a pre-loaded URL map for synchronous link resolution —
 * no async calls during rendering.
 *
 * @example
 * ```tsx
 * const urlMap = await resolver.preload()
 * <PortableTextBody value={article.body} urlMap={urlMap} />
 * ```
 */
export function PortableTextBody({ value, urlMap }: Props) {
  if (!value) return null

  return (
    <PortableText
      value={value}
      components={{
        types: {
          code: ({ value }: { value: { code?: string; language?: string } }) => (
            <CodeBlock code={value.code ?? ''} language={value.language} />
          ),
        },
        marks: {
          internalLink: ({ value, children }: { value?: { reference?: { _ref: string } }; children: React.ReactNode }) => {
            const url = value?.reference ? urlMap.get(value.reference._ref) : undefined
            return url ? <a href={url}>{children}</a> : <span>{children}</span>
          },
        },
      }}
    />
  )
}
