import {map, type Observable} from 'rxjs'

// ─── Minimal type stubs ──────────────────────────────────────────────
// We define minimal interfaces that are structurally compatible with
// sanity/presentation's types. This avoids importing React-dependent
// modules at the package level while still being assignable to the
// Presentation tool's `resolve` option.

interface DocumentLocation {
  title: string
  href: string
}

interface DocumentLocationsState {
  locations?: DocumentLocation[]
  message?: string
  tone?: 'positive' | 'caution' | 'critical'
}

type DocumentLocationResolver = (
  params: {id: string; type: string; version: string | undefined; perspectiveStack: unknown[]},
  context: {
    documentStore: {
      listenQuery: (
        query: string,
        params: Record<string, unknown>,
        options?: Record<string, unknown>,
      ) => Observable<unknown>
    }
  },
) =>
  | Observable<DocumentLocationsState | null | undefined>
  | DocumentLocationsState
  | null
  | undefined

// ─── Options ─────────────────────────────────────────────────────────

/**
 * Options for customizing the auto-generated Presentation tool config.
 */
export interface RoutesPresentationOptions {
  /**
   * Add extra locations beyond the canonical URL for specific document types.
   *
   * @example
   * ```ts
   * routesPresentation('web', {
   *   extraLocations: {
   *     product: (doc) => [
   *       { title: 'All Products', href: '/products' },
   *     ],
   *   },
   * })
   * ```
   */
  extraLocations?: Record<
    string,
    (doc: {title?: string; href: string}) => Array<{title: string; href: string}>
  >

  /**
   * Static `mainDocuments` entries for URL → document resolution.
   *
   * Since `mainDocuments` must be an array at config time (not reactive),
   * pass them explicitly if you need the Presentation tool to resolve
   * URLs back to documents.
   *
   * These are passed through directly to the Presentation tool's
   * `resolve.mainDocuments` option.
   *
   * @example
   * ```ts
   * routesPresentation('web', {
   *   mainDocuments: [
   *     { route: '/blog/:slug', filter: '_type == "blogPost" && slug.current == $slug' },
   *     { route: '/docs/:slug', filter: '_type == "article" && slug.current == $slug' },
   *   ],
   * })
   * ```
   */
  mainDocuments?: unknown[]
}

// ─── Main export ─────────────────────────────────────────────────────

/**
 * Auto-generate Presentation tool `resolve` config from route configuration.
 *
 * Reads route config + route map shards from the Content Lake to generate
 * document locations reactively. When a document's route or the route config
 * changes, the location updates automatically via `listenQuery`.
 *
 * **`locations`** (document → URL): Uses a `DocumentLocationResolver` function
 * that queries the route map shard for the document's type. The route map
 * contains pre-computed paths, so no client-side GROQ evaluation is needed.
 *
 * **`mainDocuments`** (URL → document): Optionally accepts static entries
 * via `options.mainDocuments`. These can't be generated dynamically because
 * the Presentation tool needs them at config time.
 *
 * @param channel - The route config channel (e.g., 'web')
 * @param options - Optional overrides for extra locations and mainDocuments
 * @returns Object with `locations` (and optionally `mainDocuments`) for the
 *   Presentation tool's `resolve` config
 *
 * @example Basic usage (zero config):
 * ```ts
 * import { routesPresentation } from '@sanity/routes/plugin'
 *
 * presentationTool({
 *   resolve: routesPresentation('web'),
 * })
 * ```
 *
 * @example With mainDocuments and extra locations:
 * ```ts
 * presentationTool({
 *   resolve: routesPresentation('web', {
 *     mainDocuments: [
 *       { route: '/blog/:slug', filter: '_type == "blogPost" && slug.current == $slug' },
 *       { route: '/docs/:slug', filter: '_type == "article" && slug.current == $slug' },
 *     ],
 *     extraLocations: {
 *       blogPost: (doc) => [
 *         { title: 'Blog index', href: '/blog' },
 *       ],
 *     },
 *   }),
 * })
 * ```
 */
export function routesPresentation(
  channel: string,
  options?: RoutesPresentationOptions,
) {
  const locations: DocumentLocationResolver = (params, context) => {
    // Single GROQ query that fetches:
    // 1. The route entry for this document's type (basePath)
    // 2. The pre-computed path from the route map shard
    // 3. The document title
    //
    // The route map shard ID follows the convention: routes-{channel}-{docType}
    // Each shard has entries[] with { doc: { _ref }, path }
    const query = /* groq */ `{
      "routeEntry": *[_type == "routes.config" && channel == $channel][0]
        .routes[count(types[@ == $type]) > 0][0]{ basePath },
      "mapEntry": *[
        _type == "routes.map"
        && channel == $channel
        && documentType == $type
      ][0].entries[doc._ref == $id][0]{ path },
      "doc": *[_id == $id || _id == "drafts." + $id][0]{ title }
    }`

    return (
      context.documentStore.listenQuery(
        query,
        {channel, id: params.id, type: params.type},
        {perspective: 'previewDrafts'},
      ) as Observable<{
        routeEntry: {basePath: string} | null
        mapEntry: {path: string} | null
        doc: {title: string} | null
      }>
    ).pipe(
      map((result) => {
        if (!result?.routeEntry || !result?.doc) return null

        const basePath = result.routeEntry.basePath || ''
        const path = result.mapEntry?.path
        const title = result.doc.title || 'Untitled'

        // Build the href from basePath + resolved path
        // If no map entry exists yet (shard not built), show basePath only
        const href = path ? `${basePath}/${path}` : basePath || '/'

        const canonicalLocation: DocumentLocation = {title, href}

        // Merge any extra locations from options
        const extras =
          options?.extraLocations?.[params.type]?.({title, href}) || []

        return {
          locations: [canonicalLocation, ...extras],
          ...(path
            ? {}
            : {
                message:
                  'Route map not built yet — run the sync function to generate paths',
                tone: 'caution' as const,
              }),
        }
      }),
    )
  }

  // Build the result object. We use a plain object with explicit typing
  // so it's structurally compatible with PresentationPluginOptions['resolve'].
  // The `as any` on mainDocuments avoids fighting with the discriminated union
  // type — the consumer passes the correct shape, we just pass it through.
  const result: Record<string, unknown> = {locations}

  if (options?.mainDocuments && options.mainDocuments.length > 0) {
    result.mainDocuments = options.mainDocuments
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return result as any
}
