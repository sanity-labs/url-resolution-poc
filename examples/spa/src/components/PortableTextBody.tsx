import { PortableText, type PortableTextComponents, type PortableTextProps } from '@portabletext/react'
import { Link } from 'react-router'
import { getPath } from '@sanity/routes'

interface Props {
  value: PortableTextProps['value']
  urlMap: Record<string, string>
}

const createComponents = (urlMap: Record<string, string>): PortableTextComponents => ({
  marks: {
    internalLink: ({ children, value: mark }) => {
      const docId = mark?.reference?._ref
      const url = docId ? urlMap[docId] : undefined
      const href = url ? getPath(url) ?? url : undefined

      if (!href) return <span>{children}</span>

      return <Link to={href}>{children}</Link>
    },
  },
})

export default function PortableTextBody({ value, urlMap }: Props) {
  return <PortableText value={value} components={createComponents(urlMap)} />
}
