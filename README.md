# @sanity/routes

**URL resolution for Sanity structured content.**

Sanity documents don't know their own URLs. This package fixes that — one route config in the Content Lake, and every consumer (frontends, MCP, Presentation tool, sitemaps) resolves URLs from the same source of truth.

> **Status:** Proof of concept. The API is being validated against sanity.io's own content model before packaging for general use.

## Table of Contents

- [Quick Start](#quick-start) · [Setup Your Own Project](#setup-your-own-project) · [How It Works](#how-it-works) · [Route Config](#route-config) · [Resolver API](#resolver-api) · [Integration Guides](#integration-guides) · [Advanced Topics](#advanced-topics) · [Background](#background) · [Appendix](#appendix)

---

## Quick Start

> **Note:** `@sanity/routes` is not yet published to npm. Clone this repo to try it.

```bash
git clone https://github.com/sanity-labs/url-resolution-poc.git
cd url-resolution-poc
pnpm install
pnpm --filter @sanity/routes build
pnpm dev  # Studio → :3333, Frontend → :3000
```

Try the resolver against the live dataset — no token needed:

```ts
import { createRouteResolver } from '@sanity/routes'
import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'bb8k7pej',
  dataset: 'production',
  useCdn: true,
  apiVersion: '2024-01-01',
})
const resolver = createRouteResolver(client, 'web')

const url = await resolver.resolveUrlById('article-agent-context')
// → "https://www.sanity.io/docs/ai/agent-context"
```

**Now set up routes for your own project →** [Setup Your Own Project](#setup-your-own-project)

---

## Setup Your Own Project

### 1. Install the plugin

```ts
// sanity.config.ts
import { defineConfig } from 'sanity'
import { routesPlugin } from '@sanity/routes/studio'

export default defineConfig({ plugins: [routesPlugin()] })
```

This registers the `routes.config` and `routes.map` schema types automatically.

### 2. Create your first route config

After installing the plugin, you'll see **Route Config** in your Studio sidebar. Create a new document — the plugin sets the `_id` automatically based on the channel name. Here's the shape:

```json
{
  "_id": "routes-config-web",
  "_type": "routes.config",
  "channel": "web",
  "isDefault": true,
  "baseUrls": [{ "name": "production", "url": "https://www.example.com", "isDefault": true }],
  "routes": [{ "types": ["blogPost"], "basePath": "/blog", "mode": "simpleSlug", "pathExpression": "slug.current" }]
}
```

This tells the resolver: "blogPost documents live at `/blog/{slug}`."

### 3. Test with resolveUrlById

```ts
import { createRouteResolver } from '@sanity/routes'
import { createClient } from '@sanity/client'

const client = createClient({ projectId: 'your-project-id', dataset: 'production', useCdn: true, apiVersion: '2024-01-01' })
const resolver = createRouteResolver(client, 'web')

const url = await resolver.resolveUrlById('your-blog-post-id')
// → "https://www.example.com/blog/hello-world"
```

### 4. Add to your frontend

```tsx
// app/blog/page.tsx — Next.js Server Component
import { createRouteResolver } from '@sanity/routes'
import { client } from '@/lib/sanity.client'

const resolver = createRouteResolver(client, 'web')

export default async function BlogIndex() {
  const pathField = await resolver.groqField('blogPost')
  const posts = await client.fetch(
    `*[_type == "blogPost"] | order(publishedAt desc) { _id, title, ${pathField} }`
  )
  return (
    <ul>
      {posts.map((post) => (
        <li key={post._id}><a href={post.path}>{post.title}</a></li>
      ))}
    </ul>
  )
}
```

For more patterns, see [Integration Guides](#integration-guides).

---

## How It Works

```
┌──────────────────────────────────────────────────────────────────┐
│                         Content Lake                              │
│                                                                   │
│  ┌───────────────────┐                 ┌─────────────────────┐    │
│  │  routes.config    │                 │  routes.map         │    │
│  │  ─────────────    │    Sync         │  ─────────────────  │    │
│  │  channel: "web"   │    Function     │  article-xyz:       │    │
│  │  baseUrls: [...]  │ ──────────────> │    path: "ai/..."   │    │
│  │  routes: [...]    │  on publish/    │    _ref: "art-xyz"  │    │
│  │                   │  unpublish      │                     │    │
│  └───────────────────┘                 └─────────────────────┘    │
│           │                                      │                │
│           │  Routable documents                  │                │
│           │  trigger the Function                │                │
│           │  on publish                          │                │
└───────────┼──────────────────────────────────────┼────────────────┘
            │                                      │
     reads config,                          reads pre-computed
     evaluates GROQ                         map shards
     per document                           in one query
            │                                      │
            ▼                                      ▼
   ┌─────────────────────┐                  ┌──────────────────┐
   │  Realtime Mode      │                  │   Static Mode    │
   │  resolveUrlById()   │                  │  preload()       │
   │  groqField()        │                  │  sitemaps        │
   │  listen()           │                  │  PT links        │
   └──────────┬──────────┘                  └────────┬─────────┘
              └──────────────┬───────────────────────┘
                             ▼
              ┌───────────────────────────┐
              │  Frontend  MCP  Studio CI │
              └───────────────────────────┘
```

### Two modes, one config

**Realtime mode** reads the route config and evaluates GROQ path expressions against live data. When a slug changes, the resolved URL updates immediately.

```ts
const url = await resolver.resolveUrlById('article-agent-context')
// → "https://www.sanity.io/docs/ai/agent-context"
```

**Static mode** reads from a pre-computed route map. One query loads every document→URL mapping — ideal for sitemaps, Portable Text links, and bulk operations.

```ts
const urlMap = await resolver.preload()
urlMap.get('article-agent-context') // → "https://www.sanity.io/docs/ai/agent-context"
```

Both modes read from the same route config. The sync Function that keeps the static map updated is covered in [Advanced Topics](#sync-function).

---

## Route Config

The route config is a `routes.config` document in the Content Lake defining your URL structure for a given channel.

### Route modes

| Mode | When to use | GROQ knowledge needed |
|------|------------|----------------------|
| `simpleSlug` | Document has a `slug` field, URL is `basePath + slug` | None |
| `parentSlug` | URL includes a parent segment (e.g., section/article) | None — the resolver builds the GROQ |
| `custom` | Complex URL logic that doesn't fit the above | Yes — you write the GROQ expression |

**Slug only** — 90% of document types:
```json
{ "types": ["blogPost"], "basePath": "/blog", "mode": "simpleSlug", "pathExpression": "slug.current" }
```

**Section + slug** — hierarchical content:
```json
{ "types": ["article"], "basePath": "/docs", "mode": "parentSlug", "parentType": "docsNavSection", "parentRelationship": "parentReferencesChild" }
```

**Custom GROQ** — anything else:
```json
{ "types": ["article"], "basePath": "/docs", "mode": "custom", "pathExpression": "coalesce(*[_type == \"docsNavSection\" && references(^._id)][0].slug.current + \"/\", \"\") + slug.current" }
```

### Full example

```json
{
  "_id": "routes-config-web",
  "_type": "routes.config",
  "channel": "web",
  "isDefault": true,
  "baseUrls": [
    { "name": "production", "url": "https://www.sanity.io", "isDefault": true },
    { "name": "staging", "url": "https://staging.sanity.io" },
    { "name": "preview", "url": "https://*.sanity.dev" }
  ],
  "routes": [
    { "types": ["blogPost"], "basePath": "/blog", "mode": "simpleSlug", "pathExpression": "slug.current" },
    { "types": ["article"], "basePath": "/docs", "mode": "parentSlug", "parentType": "docsNavSection", "parentRelationship": "parentReferencesChild" },
    { "types": ["product"], "basePath": "/products", "mode": "simpleSlug", "pathExpression": "slug[_key == $locale][0].value", "locales": ["en", "fr", "de"] },
    { "types": ["page"], "basePath": "/", "mode": "simpleSlug", "pathExpression": "slug.current" }
  ]
}
```

### Channel concept

A "channel" represents a distinct URL namespace. Most projects have one (`web`). For single-channel projects, the resolver auto-detects:

```ts
const resolver = createRouteResolver(client) // finds the only routes.config automatically
```

---

## Resolver API

Import from `@sanity/routes` — the main entry point is RSC-safe with zero React dependencies.

### `createRouteResolver(client, channel?, options?)`

Creates a resolver instance. Returns `RealtimeRouteResolver` by default, or `StaticRouteResolver` with `{ mode: 'static' }`. Channel is optional — if your project has a single `routes.config` document, the resolver finds it automatically.

```ts
import { createRouteResolver } from '@sanity/routes'
import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'your-project-id',
  dataset: 'production',
  useCdn: true,
  apiVersion: '2024-01-01',
})

// Realtime mode (default)
const resolver = createRouteResolver(client, 'web')

// Static mode — enables preload() and resolveDocumentByUrl()
const staticResolver = createRouteResolver(client, 'web', { mode: 'static' })

// Auto-detect single channel
const autoResolver = createRouteResolver(client)

// With error handling
const resolver = createRouteResolver(client, 'web', {
  environment: 'production',
  warn: process.env.NODE_ENV !== 'production',
  onResolutionError: (diagnosis) => console.error(diagnosis.message),
})
```

| Option | Type | Description |
|--------|------|-------------|
| `mode` | `'realtime' \| 'static'` | Resolution mode. Default: `'realtime'`. |
| `environment` | `string` | Which base URL to use. Defaults to `isDefault`. |
| `locale` | `string` | Default locale for `$locale` in pathExpressions. |
| `warn` | `boolean` | Log to console when resolution returns `null`. |
| `onResolutionError` | `(error) => void` | Callback on failure. Receives `DiagnosisResult`. |

### RealtimeRouteResolver

The default resolver. Evaluates GROQ path expressions live.

| Method | Returns | Description |
|--------|---------|-------------|
| `resolveUrlById(id, opts?)` | `Promise<string \| null>` | Resolve one document ID to its full URL. |
| `resolveUrlByIds(ids, opts?)` | `Promise<Map<string, string>>` | Batch resolution. Unresolvable IDs omitted. |
| `groqField(type)` | `Promise<string>` | GROQ projection fragment for embedding in queries. |
| `listen()` | `() => void` | Subscribe to config changes. Returns unsubscribe fn. |
| `diagnose(id, opts?)` | `Promise<DiagnosisResult>` | Debug why resolution fails. |

```ts
// Resolve a single URL
const url = await resolver.resolveUrlById('article-agent-context')
// → "https://www.sanity.io/docs/ai/agent-context"

// Embed URL resolution in GROQ queries
const pathField = await resolver.groqField('article')
const articles = await client.fetch(`*[_type == "article"]{ _id, title, ${pathField} }`)
// Each article now has a .path field with the resolved URL path

// Listen for config changes (dev servers, long-running processes)
const unsubscribe = resolver.listen()
```

### StaticRouteResolver

Created with `{ mode: 'static' }`. Has all realtime methods plus:

| Method | Returns | Description |
|--------|---------|-------------|
| `preload(opts?)` | `Promise<Map<string, string>>` | Load all shards for synchronous lookups. |
| `rebuildType(type, opts?)` | `Promise<void>` | Rebuild a type's route map shard. |
| `resolveDocumentByUrl(url)` | `Promise<{ id, type } \| null>` | Reverse resolution — URL → document. |

```ts
const staticResolver = createRouteResolver(client, 'web', { mode: 'static' })
const urlMap = await staticResolver.preload()
urlMap.get('article-agent-context') // → "https://www.sanity.io/docs/ai/agent-context"

const doc = await staticResolver.resolveDocumentByUrl('/docs/ai/agent-context')
// → { id: 'article-agent-context', type: 'article' }
```

### `diagnose()`

When `resolveUrlById` returns `null`, use `diagnose()` to find out why. Returns one of 6 statuses:

| Status | Meaning |
|--------|---------|
| `resolved` | URL resolved successfully. |
| `document_not_found` | No document exists with this ID. |
| `no_route_entry` | Document exists but its type has no route config. |
| `empty_path` | Route matched but pathExpression evaluated to null/empty. |
| `no_config` | No `routes.config` found for the channel. |
| `shard_not_found` | (Static mode) No shard built yet for this type. |

```ts
const result = await resolver.diagnose('my-doc')
if (result.status !== 'resolved') {
  console.warn(result.message)
  // "No route entry for type "article". Available routable types: blogPost, page."
}
if (result.status === 'no_route_entry') {
  console.log(result.availableRoutes) // ['blogPost', 'page']
}
```

### Error handling (progressive)

1. **Silent `null`** — Default. No noise in production.
2. **`warn: true`** — Console logging for development:
   ```ts
   createRouteResolver(client, 'web', { warn: process.env.NODE_ENV !== 'production' })
   ```
3. **`onResolutionError`** — Callback with `DiagnosisResult` for error tracking:
   ```ts
   createRouteResolver(client, 'web', { onResolutionError: (d) => sentry.captureMessage(d.message) })
   ```

`diagnose()` is a separate tool for on-demand debugging — see [`diagnose()`](#diagnose) above.

---

## Integration Guides

### Next.js

The resolver is RSC-safe — import directly in Server Components.

```ts
// lib/routes.ts
import { createRouteResolver } from '@sanity/routes'
import { client } from './sanity.client'
export const routeResolver = createRouteResolver(client, 'web')
```

```tsx
// app/blog/page.tsx
import { routeResolver } from '@/lib/routes'

export default async function BlogIndex() {
  const pathField = await routeResolver.groqField('blogPost')
  const posts = await client.fetch(
    `*[_type == "blogPost"] | order(publishedAt desc) { _id, title, excerpt, ${pathField} }`
  )
  return (
    <ul>
      {posts.map((post) => (
        <li key={post._id}><a href={post.path}>{post.title}</a><p>{post.excerpt}</p></li>
      ))}
    </ul>
  )
}
```

### Portable Text

Use `preload()` to load all routes once, then resolve synchronously in your PT renderer.

```ts
// lib/routes.ts — export both resolver modes
export const resolver = createRouteResolver(client, 'web')
export const staticResolver = createRouteResolver(client, 'web', { mode: 'static' })
```

```tsx
import { staticResolver } from '@/lib/routes'

export async function PortableTextBody({ slug }) {
  const [post, urlMap] = await Promise.all([
    client.fetch(`*[_type == "blogPost" && slug.current == $slug][0]`, { slug }),
    staticResolver.preload(),
  ])
  const components = {
    marks: {
      internalLink: ({ value, children }) => {
        const url = urlMap.get(value.reference._ref)
        return url ? <a href={url}>{children}</a> : <span>{children}</span>
      },
    },
  }
  return <PortableText value={post.body} components={components} />
}
```

The `Promise.all` pattern loads the route map in parallel with your content query — no waterfall.

### Presentation Tool

`routesPresentation()` auto-generates `resolve.locations` and `resolve.mainDocuments` from the route config. It's exported from `@sanity/routes` (not `./studio`) because it has no React dependency — it returns plain config objects.

```ts
// sanity.config.ts
import { presentationTool } from 'sanity/presentation'
import { routesPlugin } from '@sanity/routes/studio'
import { routesPresentation } from '@sanity/routes'

export default defineConfig({
  plugins: [
    routesPlugin(),
    presentationTool({
      resolve: routesPresentation('web'),
      previewUrl: { previewMode: { enable: '/api/draft-mode/enable' } },
    }),
  ],
})
```

> Set `SANITY_STUDIO_PREVIEW_ORIGIN` env var on your Studio deployment pointing to your frontend URL. Without it, Presentation defaults to `http://localhost:3000`.

### Sitemaps

```ts
// app/sitemap.xml/route.ts
import { createRouteResolver } from '@sanity/routes'
const resolver = createRouteResolver(client, 'web', { mode: 'static' })

export async function GET() {
  const urlMap = await resolver.preload()
  const urls = Array.from(urlMap.values()).map((url) => `<url><loc>${url}</loc></url>`).join('\n')
  return new Response(
    `<?xml version="1.0"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`,
    { headers: { 'Content-Type': 'application/xml' } }
  )
}
```

### MCP / AI Agents

```ts
import { createRouteResolver } from '@sanity/routes'

const resolver = createRouteResolver(client, 'web')

async function getDocumentUrl(documentId: string) {
  const url = await resolver.resolveUrlById(documentId)
  if (!url) throw new Error(`No route found for ${documentId}`)
  return url
}
```

Zero-token resolution means MCP tools don't need credentials on public datasets. AI agents get correct URLs — including hierarchical paths like `/docs/ai/agent-context` that require cross-document GROQ joins.

---

## Advanced Topics

### Sync Function

The static route map is kept in sync by a Sanity Function. Publish a document → route map updates within seconds.

```ts
// studio/functions/route-sync-web/index.ts
import { createRouteSyncHandler } from '@sanity/routes/handler'
export const handler = createRouteSyncHandler('web')
```

```ts
// studio/functions/route-sync-web/function.ts
import { defineDocumentFunction } from '@sanity/blueprints'
import { defineRouteSyncBlueprint } from '@sanity/routes/handler'
export const routeSyncFunction = defineDocumentFunction(
  defineRouteSyncBlueprint('web', { types: ['blogPost', 'article', 'docsNavSection'] })
)
```

```ts
// studio/sanity.blueprint.ts
import { defineBlueprint } from '@sanity/blueprints'
import { routeSyncFunction } from './functions/route-sync-web/function'
export default defineBlueprint({ resources: [routeSyncFunction] })
```

Deploy: `cd studio && pnpx sanity blueprints deploy`

On publish, the handler reads the route config, evaluates the `pathExpression`, and upserts the route map shard. On delete, removes the entry. On parent change, cascades to re-sync all children.

**Design decisions:** Recursion-safe (`routes.map` never matches the filter). Draft-safe (only fires on publish). Atomic upserts (`createIfNotExists` + `unset` + `insert`).

### i18n / Localized URLs

Route entries declare supported locales. `$locale` is available in pathExpressions:

```json
{ "types": ["product"], "basePath": "/products", "pathExpression": "slug[_key == $locale][0].value", "locales": ["en", "fr", "de"] }
```

```ts
await resolver.resolveUrlById('product-123', { locale: 'fr' }) // per-call
const resolver = createRouteResolver(client, 'web', { locale: 'fr' }) // default
const frMap = await resolver.preload({ locale: 'fr' }) // locale-specific preload
```

Locale-specific shards are built automatically. For document-level i18n, use `language + "/" + slug.current` as the pathExpression.

### Multiple Environments

```json
{ "baseUrls": [
  { "name": "production", "url": "https://www.sanity.io", "isDefault": true },
  { "name": "staging", "url": "https://staging.sanity.io" },
  { "name": "preview", "url": "https://*.sanity.dev" }
]}
```

```ts
const resolver = createRouteResolver(client, 'web', { environment: 'staging' })
await resolver.resolveUrlById('article-agent-context')
// → "https://staging.sanity.io/docs/ai/agent-context"
```

Preview URLs support wildcards for branch-based deployments.

### Scale Considerations

- **Shard size:** ~200 bytes/entry, ~160K entries/shard. Per-type sharding means most projects never hit limits.
- **Realtime vs static:** Realtime evaluates GROQ per call (~194ms with parent lookup). Static loads all shards in one query. Use static for >10 URLs.
- **`preload()` memory:** ~2MB for 10K documents. Negligible for SSR.
- **Sync throughput:** 3 reads + 1 write per publish. For bulk imports, use `buildRouteMap()`.
- **Parent fan-out:** Parent change re-syncs children sequentially. Fine for editorial; needs batching for bulk.

---

## Background

### Why This Exists

- **One source of truth** — route config in the Content Lake. Frontends, MCP, Presentation tool, sitemaps all read from the same place.
- **Correct hierarchical URLs** — path expressions handle cross-document GROQ joins. No more 404s from missing path segments.
- **AI agents get working links** — MCP resolves through the same system as the frontend.
- **Zero-token resolution** — public-friendly IDs. Any consumer resolves URLs with just a project ID.
- **No build-time config** — edit routes in Studio, every consumer picks it up immediately.
- **Foundation for more** — redirects, sitemaps, link validation each become an afternoon project.

### The Problem

Documents in Sanity don't know their own URLs. A docs article at `/docs/getting-started/installation` gets its `getting-started/` prefix from a navigation section document — a cross-document GROQ join that the article itself knows nothing about. A blog post's URL might depend on its category. A product page might derive its path from a brand hierarchy.

This creates a systemic problem:

- **Every consumer reinvents URL resolution.** Frontend, Studio, Presentation tool, MCP, and Functions all build their own GROQ joins to map document IDs to URLs
- **Portable Text internal links require per-link resolution** at render time — the link only carries a document `_ref` with no URL information
- **Content model changes break URL logic silently** across every consumer independently. Rename a slug field, restructure navigation — breakage everywhere.
- **Sitemaps, redirects, and link validation** all solve the same mapping problem from scratch, with no shared source of truth

Multiple systems solving the same problem. None of them aware of each other. All of them fragile.

> **Future:** Automatic redirects on slug change, cross-document link validation, and link health checks via weak reference queries become straightforward to build on this foundation.

---

## Appendix

### Package Exports

| Entry Point | Import | Use For |
|-------------|--------|---------|
| `@sanity/routes` | `import { createRouteResolver } from '@sanity/routes'` | Frontends, API routes, scripts — RSC-safe |
| `@sanity/routes/studio` | `import { routesPlugin } from '@sanity/routes/studio'` | Studio plugins, schema, components |
| `@sanity/routes/handler` | `import { createRouteSyncHandler } from '@sanity/routes/handler'` | Sanity Function handlers |

### Project Structure

```
url-resolution-poc/
├── packages/routes/src/           # @sanity/routes package
│   ├── resolver-entry.ts          # Main entry (RSC-safe)
│   ├── studio-entry.ts            # Studio entry (React)
│   ├── handler-entry.ts           # Handler entry (Functions)
│   ├── resolver.ts                # createRouteResolver()
│   ├── plugin.ts / schema.ts      # Studio plugin + schemas
│   ├── presentation.ts            # routesPresentation()
│   ├── build.ts / handler.ts      # Build + sync handler
│   └── types.ts / components/     # Types + custom inputs
├── studio/                        # Sanity Studio + Functions
├── examples/nextjs/               # Next.js 16 frontend
└── package.json                   # pnpm workspaces monorepo
```

### Known Limitations

- **Static mode filter** — `preload()` loads the entire map. No type-scoped loading yet.
- **No nested routes** — `parentSlug` handles one level. No deep nesting.
- **Single dataset** — cross-dataset resolution not supported.
- **Reverse resolution** — linear scan (needs index at 100K+).

### Monorepo Development Notes

This POC uses pnpm workspaces where `@sanity/routes` is a local package. README examples show the ideal published-package DX. Monorepo workarounds that wouldn't exist in a real project:

- **Function handler vendoring** — The Sanity Functions bundler can't resolve pnpm workspace symlinks. The sync Function uses a vendored `_handler.js` built from the package source. Published package would be a clean two-liner.
- **Build before test** — `pnpm build` required before `sanity functions test` or `sanity blueprints deploy`, since the Function references compiled output.
- **Workspace refs** — `"@sanity/routes": "workspace:*"` → would be `"@sanity/routes": "^1.0.0"` in a real project.

In a real project, you'd `pnpm add @sanity/routes` and all imports work without build steps or vendoring.

---

## License

MIT
