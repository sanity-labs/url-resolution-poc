import {useState, useEffect} from 'react'
import {type SlugInputProps, useDocumentStore, useFormValue} from 'sanity'
import {Stack, Text} from '@sanity/ui'
import {map, switchMap, of} from 'rxjs'
import {getPublishedId, type DocumentId} from '@sanity/id-utils'

/**
 * Options for creating a SlugWithUrlPreview component.
 *
 * @public
 */
export interface SlugUrlPreviewOptions {
  /** Channel name. When omitted, queries for the default config (isDefault: true). */
  channel?: string
}

/**
 * Creates a slug input component that shows the resolved URL prefix above the slug field.
 *
 * Wraps the default slug input and reactively queries the route config to
 * assemble the full URL prefix (baseUrl + basePath + optional parent slug).
 *
 * Handles both `simpleSlug` mode (basePath only) and `parentSlug` mode
 * (basePath + parent document's slug).
 *
 * @param options - Configuration options. When `channel` is omitted, queries for the
 *   default config (`isDefault: true`). When specified, queries for the named channel.
 * @returns A React component suitable for use as a slug field input.
 *
 * @example Single-channel project (auto-detects default config)
 * ```ts
 * import {SlugWithUrlPreview} from '@sanity/routes/studio'
 *
 * defineField({
 *   name: 'slug',
 *   type: 'slug',
 *   options: { source: 'title' },
 *   components: { input: SlugWithUrlPreview },
 * })
 * ```
 *
 * @example Multi-channel project (explicit channel)
 * ```ts
 * import {createSlugWithUrlPreview} from '@sanity/routes/studio'
 *
 * const SlugWithUrlPreview = createSlugWithUrlPreview({ channel: 'web' })
 *
 * defineField({
 *   name: 'slug',
 *   type: 'slug',
 *   options: { source: 'title' },
 *   components: { input: SlugWithUrlPreview },
 * })
 * ```
 *
 * @public
 */
export function createSlugWithUrlPreview(options: SlugUrlPreviewOptions = {}) {
  return function SlugWithUrlPreviewComponent(props: SlugInputProps) {
    const documentStore = useDocumentStore()
    const docType = useFormValue(['_type']) as string
    const docId = useFormValue(['_id']) as string
    const [urlPrefix, setUrlPrefix] = useState<string | null>(null)

    useEffect(() => {
      if (!docType) return

      const cleanId = getPublishedId((docId || '') as DocumentId)

      // When channel is specified, query by channel name.
      // When omitted, query for the default config (isDefault: true).
      const query = options.channel
        ? `*[_type == "routes.config" && channel == $channel][0]{
            routes,
            "baseUrl": baseUrls[isDefault == true][0].url
          }`
        : `*[_type == "routes.config" && isDefault == true][0]{
            routes,
            "baseUrl": baseUrls[isDefault == true][0].url
          }`

      const params: Record<string, string> = options.channel ? {channel: options.channel} : {}

      const sub = documentStore
        .listenQuery(query, params, {perspective: 'previewDrafts'})
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
}

/**
 * A slug input component that shows the resolved URL prefix above the slug field.
 *
 * Convenience export that auto-detects the channel by querying for the default
 * config (`isDefault: true`). For multi-channel projects, use
 * {@link createSlugWithUrlPreview} with an explicit channel instead.
 *
 * @example
 * ```ts
 * import {SlugWithUrlPreview} from '@sanity/routes/studio'
 *
 * defineField({
 *   name: 'slug',
 *   type: 'slug',
 *   options: { source: 'title' },
 *   components: { input: SlugWithUrlPreview },
 * })
 * ```
 *
 * @public
 */
export const SlugWithUrlPreview = createSlugWithUrlPreview()
