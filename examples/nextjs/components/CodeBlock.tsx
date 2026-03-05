import { highlight } from 'sugar-high'

interface CodeBlockProps {
  code: string
  language?: string
}

/**
 * Lightweight syntax-highlighted code block using sugar-high (~1KB).
 * Works synchronously in Server Components and PortableText renderers.
 * Supports JS/TS/JSX/TSX with generic fallback for other languages.
 *
 * Theming is done via CSS custom properties — see the <style> block below.
 * sugar-high token types: identifier, keyword, string, comment, sign,
 * class, number, property, jsxliterals, space, break
 */
export function CodeBlock({ code, language }: CodeBlockProps) {
  const html = highlight(code)

  return (
    <>
      <style>{`
        .sh-code {
          --sh-class: #8be9fd;
          --sh-identifier: #f8f8f2;
          --sh-sign: #8be9fd;
          --sh-property: #50fa7b;
          --sh-entity: #f1fa8c;
          --sh-jsxliterals: #bd93f9;
          --sh-string: #f1fa8c;
          --sh-keyword: #ff79c6;
          --sh-comment: #6272a4;
          --sh-number: #bd93f9;
        }
      `}</style>
      <pre
        style={{
          background: '#282a36',
          color: '#f8f8f2',
          padding: '1rem',
          borderRadius: '6px',
          overflow: 'auto',
          fontSize: '0.875rem',
          lineHeight: 1.7,
        }}
      >
        {language && (
          <span
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.75rem',
              color: '#6272a4',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {language}
          </span>
        )}
        <code
          className="sh-code"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </pre>
    </>
  )
}
