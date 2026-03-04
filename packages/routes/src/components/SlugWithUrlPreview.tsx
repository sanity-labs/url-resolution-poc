import {useState, useEffect} from 'react'
import {type SlugInputProps, useDocumentStore, useFormValue} from 'sanity'
import {Stack, Text} from '@sanity/ui'
import {map, switchMap, of} from 'rxjs'

/**
 * The channel to use when querying route config.
 * Could be made configurable via plugin options in the future.
 */
const DEFAULT_CHANNEL = 'web'

/**
 * A slug input component that shows the resolved URL prefix above the slug field.
 *
 * Wraps the default slug input and reactively queries the route config to
 * assemble the full URL prefix (baseUrl + basePath + optional parent slug).
 *
 * Handles both `simpleSlug` mode (basePath only) and `parentSlug` mode
 * (basePath + parent document's slug).
 *
 * @example
 * ```ts
 * import {SlugWithUrlPreview} from '@sanity/routes'
 *
 * defineField({
 *   name: 'slug',
 *   type: 'slug',
 *   options: { source: 'title' },
 *   components: { input: SlugWithUrlPreview },
 * })
 * ```
 */
export function SlugWithUrlPreview(props: SlugInputProps) {
  const documentStore = useDocumentStore()
  const docType = useFormValue(['_type']) as string
  const docId = useFormValue(['_id']) as string
  const [urlPrefix, setUrlPrefix] = useState<string | null>(null)

  useEffect(() => {
    if (!docType) return

    const cleanId = (docId || '').replace(/^drafts\./, '')

    const sub = documentStore
      .listenQuery(
        `*[_type == "routes.config" && channel == $channel][0]{
          routes,
          "baseUrl": baseUrls[isDefault == true][0].url
        }`,
        {channel: DEFAULT_CHANNEL},
        {perspective: 'previewDrafts'},
      )
      .pipe(
        switchMap((config: any) => {
          if (!config?.routes) return of(null)

          // Find the route entry for this document type
          const routeEntry = config.routes.find((r: any) => r.types?.includes(docType))
          if (!routeEntry) return of(null)

          const baseUrl = (config.baseUrl || '').replace(/\/$/, '')
          const basePath = routeEntry.basePath || ''

          // If parentSlug mode, chain a second query for the parent slug
          if (routeEntry.mode === 'parentSlug' && routeEntry.parentType && cleanId) {
            return documentStore
              .listenQuery(
                `*[_type == $parentType && references($docId)][0].slug.current`,
                {parentType: routeEntry.parentType, docId: cleanId},
                {perspective: 'previewDrafts'},
              )
              .pipe(
                map((parentSlug: any) => {
                  if (parentSlug) {
                    return `${baseUrl}${basePath}/${parentSlug}/`
                  }
                  return `${baseUrl}${basePath}/`
                }),
              )
          }

          return of(`${baseUrl}${basePath}/`)
        }),
      )
      .subscribe({
        next: (prefix) => setUrlPrefix(prefix),
        error: (err) => console.error('[@sanity/routes] URL preview error:', err),
      })

    return () => sub.unsubscribe()
  }, [documentStore, docType, docId])

  return (
    <Stack space={2}>
      {urlPrefix && (
        <Text size={1} muted>
          {urlPrefix}
        </Text>
      )}
      {props.renderDefault(props)}
    </Stack>
  )
}
