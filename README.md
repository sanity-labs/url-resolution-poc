# @sanity/routes

**URL resolution for Sanity structured content.**

Sanity documents don't know their own URLs. This package fixes that — one route config in the Content Lake, and every consumer (frontends, MCP, Presentation tool, sitemaps) resolves URLs from the same source of truth.

> **Status:** Proof of concept. The API is being validated against sanity.io's own content model before packaging for general use.

---

## Quick Start

```bash
# Clone and install
git clone https://github.com/sanity-labs/url-resolution-poc.git
cd url-resolution-poc
pnpm install

# Build the package
pnpm --filter @sanity/routes build

# Start everything (Studio + Frontend)
pnpm dev
# Studio at http://localhost:3333
# Frontend at http://localhost:3000
```

Or try the resolver directly — no token needed:

```ts
import { createRouteResolver } from '@sanity/routes/resolver'
import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'bb8k7pej',
  dataset: 'production',
  useCdn: true,
  apiVersion: '2026-03-01',
})
const resolver = createRouteResolver(client, 'web')

const url = await resolver.resolveById('article-agent-context')
// → "https://www.sanity.io/docs/ai/agent-context"
```

---

## The Problem

The URL for a Sanity document like "Agent Context" isn't `/docs/agent-context`. It's `/docs/ai/agent-context` — because the `ai/` prefix comes from a `docsNavSection` document that references the article through a GROQ join. The document itself has no idea.

This caused real problems:

- **The MCP served 404s to AI agents** during the AI brand launch. Nordstrom flagged it. The MCP couldn't construct correct URLs because the URL depends on cross-document relationships it didn't know about.
- **The Presentation tool needs manual `resolve.locations` config** for every document type. Each type requires hand-written location resolution logic.
- **Every frontend reinvents URL resolution** with custom GROQ joins. The marketing site, the docs site, and the blog all have their own URL-building code.
- **Sitemaps, redirects, and link validation** all solve the same problem independently — mapping document IDs to URLs.
- **When the content model changes, all of these break silently.** A renamed slug field or restructured navigation means hunting down URL logic across multiple codebases.

Five independent systems solving the same problem. None of them aware of each other. All of them fragile.

---

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│                     Content Lake                         │
│                                                          │
│  ┌──────────────────┐    ┌─────────────────────────┐    │
│  │  routes.config    │    │  routes.map (generated) │    │
│  │  ─────────────    │    │  ─────────────────────  │    │
│  │  channel: "web"   │    │  "article-xyz" → {      │    │
│  │  baseUrls: [...]  │    │    path: "/docs/ai/...",│    │
│  │  routes: [...]    │    │    _ref: "article-xyz"  │    │
│  │                   │    │  }                      │    │
│  └──────────────────┘    └─────────────────────────┘    │
│           │                          │                   │
└───────────┼──────────────────────────┼───────────────────┘
            │                          │
            ▼                          ▼
   ┌─────────────────┐      ┌──────────────────┐
   │  Realtime Mode   │      │   Static Mode    │
   │  (primary)       │      │   (optimization) │
   │                  │      │                  │
   │  GROQ evaluation │      │  Pre-computed    │
   │  per document    │      │  route map       │
   │                  │      │                  │
   │  • resolveById() │      │  • preload()     │
   │  • groqField()   │      │  • sitemaps      │
   │  • listen()      │      │  • PT links      │
   └────────┬─────────┘      └────────┬─────────┘
            │                          │
            ▼                          ▼
   ┌──────────────────────────────────────────┐
   │              Consumers                    │
   │                                           │
   │  Frontend  │  MCP  │  Presentation  │ CI  │
   └──────────────────────────────────────────┘
```

### Two modes, one config

**Realtime mode** is the primary resolution path. It reads the route config document and evaluates GROQ path expressions against live data. When a slug changes, the resolved URL updates immediately — no rebuild, no cache invalidation.

```ts
// Realtime: evaluates the GROQ expression for this specific document
const url = await resolver.resolveById('article-agent-context')
// → "https://www.sanity.io/docs/ai/agent-context"
```

**Static mode** is an optimization for bulk operations. A pre-computed route map document (`routes.map`) stores every document→URL mapping. One query loads the entire map — useful for sitemaps, Portable Text link resolution, and anywhere you need thousands of URLs at once.

```ts
// Static: loads the entire pre-computed map, returns a sync Map
const urlMap = await resolver.preload()
urlMap.get('article-agent-context')
// → "https://www.sanity.io/docs/ai/agent-context"
```

Both modes read from the same route config. You don't choose one or the other — you use whichever fits the access pattern.

---

## DX Highlights

### 1. Zero-token resolution

Route documents use deterministic, public-friendly IDs. On public datasets, no API token is needed. Any consumer can resolve URLs with just a project ID.

```ts
import { createClient } from '@sanity/client'
import { createRouteResolver } from '@sanity/routes/resolver'

// No token. No secret. Just resolve.
const client = createClient({
  projectId: 'bb8k7pej',
  dataset: 'production',
  useCdn: true,
})
const resolver = createRouteResolver(client, 'web')
```

This means the MCP, CI pipelines, and third-party integrations can all resolve URLs without managing credentials.

### 2. Content Lake is the single source of truth

No `defineRoutes()` in your frontend. No deploy step. The route config lives in the Content Lake as a document. Edit it in the Studio, and every consumer picks up the change immediately.

```
Before: routes defined in 5 places (frontend, MCP, Presentation config, sitemap generator, redirect rules)
After:  routes defined in 1 place (Content Lake), consumed everywhere
```

### 3. Plugin pattern — one line in your Studio config

```ts
import { routesPlugin } from '@sanity/routes/plugin'

export default defineConfig({
  plugins: [
    routesPlugin(), // Registers schema, adds route config UI
  ],
})
```

The plugin registers the `routes.config` and `routes.map` schema types automatically. No manual schema definitions.

### 4. Progressive disclosure for route config

Most routes are simple. The config reflects that:

**Slug only** — for 90% of document types:
```json
{
  "types": ["blogPost"],
  "basePath": "/blog",
  "mode": "simpleSlug",
  "pathExpression": "slug.current"
}
```

**Section + slug** — for hierarchical content:
```json
{
  "types": ["article"],
  "basePath": "/docs",
  "mode": "parentSlug",
  "parentType": "docsNavSection",
  "parentRelationship": "parentReferencesChild"
}
```

**Custom GROQ expression** — for anything else:
```json
{
  "types": ["article"],
  "basePath": "/docs",
  "mode": "custom",
  "pathExpression": "coalesce(*[_type == \"docsNavSection\" && references(^._id)][0].slug.current + \"/\", \"\") + slug.current"
}
```

You don't need to know GROQ to set up routes. You only reach for it when the simple modes don't fit.

### 5. `groqField()` for inline resolution

Embed URL resolution directly in your GROQ queries. No post-processing step.

```ts
const pathField = await resolver.groqField('article')
// Returns a GROQ expression fragment

const articles = await client.fetch(
  `*[_type == "article"]{ _id, title, ${pathField} }`
)
// Each article now has a .path field with the resolved URL path
```

The resolver reads the route config, builds the appropriate GROQ expression for the given type, and returns it as a string you can interpolate into any query.

### 6. `preload()` for Portable Text

Rendering Portable Text with internal links? Load all routes once, resolve synchronously.

```ts
const urlMap = await resolver.preload()

// In your PT serializer — no async, no waterfall
const InternalLink = ({ value, children }) => {
  const url = urlMap.get(value.reference._ref)
  return <a href={url}>{children}</a>
}
```

One query. Sync lookups. No async-per-link waterfall in your rendering pipeline.

### 7. Multiple environments

Define base URLs for every environment. The resolver picks the right one.

```json
{
  "baseUrls": [
    { "name": "production", "url": "https://www.sanity.io", "isDefault": true },
    { "name": "staging", "url": "https://staging.sanity.io" },
    { "name": "preview", "url": "https://*.sanity.dev" }
  ]
}
```

```ts
// Resolve for a specific environment
const resolver = createRouteResolver(client, 'web', { environment: 'staging' })
const url = await resolver.resolveById('article-agent-context')
// → "https://staging.sanity.io/docs/ai/agent-context"
```

Preview URLs support wildcards for branch-based deployments.

### 8. Presentation tool integration

`routesPresentation()` auto-generates `resolve.locations` and `resolve.mainDocuments` from the route config. No more manual location mapping per document type.

```ts
import { presentationTool } from 'sanity/presentation'
import { routesPresentation } from '@sanity/routes/plugin'

export default defineConfig({
  plugins: [
    presentationTool({
      resolve: routesPresentation('web'),
      previewUrl: { previewMode: { enable: '/api/draft-mode/enable' } },
    }),
  ],
})
```

Every type in your route config automatically gets location resolution in the Presentation tool. Add a new type to the route config → it shows up in Presentation. No code change.

### 9. Weak references for route map entries

Static mode route map entries use weak references (`_ref` with `_weak: true`). This means:

- `references()` queries work — find all routes pointing to a document
- Stale detection comes for free — deleted documents leave dangling refs you can query for
- Natural cleanup — no orphaned route entries to garbage collect manually

### 10. RSC-safe package

`@sanity/routes/resolver` has zero React dependencies. Import it in Next.js Server Components, edge functions, or any Node.js context without bundler issues.

```ts
// app/docs/[...slug]/page.tsx — Server Component, no "use client" needed
import { createRouteResolver } from '@sanity/routes/resolver'

export default async function DocPage({ params }) {
  const resolver = createRouteResolver(client, 'web')
  // Safe in RSC — no React import, no client-side code
}
```

---

## Route Config

The route config is a document in the Content Lake with type `routes.config`. It defines your entire URL structure for a given channel (e.g., "web", "mobile", "docs").

### Full example

```json
{
  "_id": "routes-config-web",
  "_type": "routes.config",
  "channel": "web",
  "baseUrls": [
    { "name": "production", "url": "https://www.sanity.io", "isDefault": true },
    { "name": "staging", "url": "https://staging.sanity.io" },
    { "name": "preview", "url": "https://*.sanity.dev" }
  ],
  "routes": [
    {
      "types": ["blogPost"],
      "basePath": "/blog",
      "mode": "simpleSlug",
      "pathExpression": "slug.current"
    },
    {
      "types": ["article"],
      "basePath": "/docs",
      "mode": "parentSlug",
      "parentType": "docsNavSection",
      "parentRelationship": "parentReferencesChild",
      "pathExpression": "coalesce(*[_type == \"docsNavSection\" && references(^._id)][0].slug.current + \"/\", \"\") + slug.current"
    },
    {
      "types": ["page"],
      "basePath": "/",
      "mode": "simpleSlug",
      "pathExpression": "slug.current"
    }
  ]
}
```

### Route modes

| Mode | When to use | GROQ knowledge needed |
|------|------------|----------------------|
| `simpleSlug` | Document has a `slug` field, URL is `basePath + slug` | None |
| `parentSlug` | URL includes a parent segment (e.g., section/article) | None — the resolver builds the GROQ |
| `custom` | Complex URL logic that doesn't fit the above | Yes — you write the GROQ expression |

### Channel concept

A "channel" represents a distinct URL namespace. Most projects have one (`web`). If you have separate sites (marketing site, docs site, developer portal), each gets its own channel with its own route config.

---

## Resolver API

### `createRouteResolver(client, channel, options?)`

Creates a resolver instance for a given channel.

```ts
import { createRouteResolver } from '@sanity/routes/resolver'
import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'bb8k7pej',
  dataset: 'production',
  useCdn: true,
  apiVersion: '2024-01-01',
})

const resolver = createRouteResolver(client, 'web', {
  environment: 'production', // optional — defaults to the isDefault base URL
})
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `client` | `SanityClient` | A `@sanity/client` instance. No token needed for public datasets. |
| `channel` | `string` | The channel name matching your `routes.config` document. |
| `options.environment` | `string` | Which base URL environment to use. Defaults to the one marked `isDefault`. |

---

### `resolver.resolveById(id)`

Resolves a single document ID to its full URL. Uses realtime mode — evaluates the GROQ path expression against live data.

```ts
const url = await resolver.resolveById('article-agent-context')
// → "https://www.sanity.io/docs/ai/agent-context"

const url = await resolver.resolveById('blogPost-announcing-ai')
// → "https://www.sanity.io/blog/announcing-ai"
```

Returns `null` if the document doesn't match any route.

---

### `resolver.resolveByIds(ids)`

Batch resolution. Resolves multiple document IDs in a single operation.

```ts
const urls = await resolver.resolveByIds([
  'article-agent-context',
  'article-getting-started',
  'blogPost-announcing-ai',
])
// → Map {
//     'article-agent-context' => 'https://www.sanity.io/docs/ai/agent-context',
//     'article-getting-started' => 'https://www.sanity.io/docs/getting-started',
//     'blogPost-announcing-ai' => 'https://www.sanity.io/blog/announcing-ai',
//   }
```

---

### `resolver.preload()`

Loads the entire pre-computed route map. Returns a synchronous `Map<string, string>` for instant lookups. Uses static mode.

```ts
const urlMap = await resolver.preload()

// Sync lookups — no await needed
urlMap.get('article-agent-context')
// → "https://www.sanity.io/docs/ai/agent-context"

urlMap.get('nonexistent-doc')
// → undefined
```

**Note:** Only available in static mode. Create the resolver with `mode: 'static'`.

```ts
const staticResolver = createRouteResolver(client, 'web', { mode: 'static' })
const urlMap = await staticResolver.preload()

// Sitemap generation
const urlMap = await staticResolver.preload()
const sitemap = Array.from(urlMap.entries()).map(([id, url]) => ({
  url,
  lastmod: new Date().toISOString(),
}))
```

---

### `resolver.groqField(type)`

Returns a GROQ expression fragment that resolves the URL path for a given document type. Interpolate it into any GROQ query.

```ts
const pathField = await resolver.groqField('article')

const articles = await client.fetch(
  `*[_type == "article"]{
    _id,
    title,
    "publishedAt": _createdAt,
    ${pathField}
  }`
)

// Result:
// [
//   { _id: "article-agent-context", title: "Agent Context", path: "/docs/ai/agent-context", publishedAt: "..." },
//   { _id: "article-getting-started", title: "Getting Started", path: "/docs/getting-started", publishedAt: "..." },
// ]
```

The returned field name is `path` by default. The expression is built from the route config — you don't need to know what GROQ it generates.

---

### `resolver.listen()`

Subscribe to route config changes. Invalidates the resolver's internal cache when the config document changes. Returns an unsubscribe function.

```ts
// Start listening — resolver cache auto-invalidates on config changes
const unsubscribe = resolver.listen()

// Clean up when done
unsubscribe()
```

---

## Studio Setup

### 1. Install the plugin

```ts
// sanity.config.ts
import { defineConfig } from 'sanity'
import { routesPlugin } from '@sanity/routes/plugin'

export default defineConfig({
  name: 'default',
  title: 'My Studio',
  projectId: 'your-project-id',
  dataset: 'production',

  plugins: [
    routesPlugin(),
  ],
})
```

This registers the `routes.config` and `routes.map` schema types. You can now create and edit route config documents in the Studio.

### 2. Presentation tool integration

```ts
// sanity.config.ts
import { defineConfig } from 'sanity'
import { presentationTool } from 'sanity/presentation'
import { routesPlugin, routesPresentation } from '@sanity/routes/plugin'

export default defineConfig({
  plugins: [
    routesPlugin(),
    presentationTool({
      resolve: routesPresentation('web'),
      previewUrl: {
        previewMode: {
          enable: '/api/draft-mode/enable',
        },
      },
    }),
  ],
})
```

`routesPresentation('web')` reads the route config for the `web` channel and generates:

- **`resolve.locations`** — Maps each document type to its URL pattern. The Presentation tool uses this to show "Open in preview" links.
- **`resolve.mainDocuments`** — Maps URL patterns back to document types. The Presentation tool uses this to find the right document when navigating by URL.

When you add a new type to the route config, it automatically appears in the Presentation tool. No code change needed.

---

## Sync Function

The static route map (`routes.map`) is kept in sync by a Sanity Function that listens for document changes and updates the relevant shard. No cron jobs, no manual rebuilds — publish a document and the route map updates within seconds.

### What it does

When a routable document is created, updated, or deleted:

1. **Reads the route config** to find the matching route entry for the document's type
2. **Evaluates the `pathExpression`** GROQ against the document to resolve its URL path
3. **Upserts the route map shard** using a single-transaction pattern:
   - `createIfNotExists` — ensures the shard document exists
   - `unset` by `_key` — removes the old entry if present
   - `insert` — adds the new entry with the resolved path
4. **On delete** — removes the entry from the shard

The handler at `studio/functions/route-sync/index.ts`:

```ts
import { documentEventHandler } from '@sanity/functions'
import { createClient } from '@sanity/client'

export const handler = documentEventHandler(async ({ context, event }) => {
  const client = createClient({
    ...context.clientOptions,
    apiVersion: '2024-01-01',
    useCdn: false,
  })

  const docId = event.data._id
  const docType = event.data._type

  // Fetch route config and find the matching route entry
  const config = await client.fetch(`*[_type == "routes.config" && channel == "web"][0]`)
  const routeEntry = config.routes.find((r) => r.types.includes(docType))
  const shardId = `routes-web-${docType}`

  // Evaluate the pathExpression GROQ against the document
  const pathExpression = routeEntry.pathExpression || 'slug.current'
  const result = await client.fetch(
    `*[_id == $docId][0]{ "path": ${pathExpression} }`,
    { docId }
  )

  // Single-transaction upsert: createIfNotExists + unset old + insert new
  const tx = client.transaction()
    .createIfNotExists({
      _id: shardId,
      _type: 'routes.map',
      channel: 'web',
      documentType: docType,
      basePath: routeEntry.basePath,
      entries: [],
    })

  // ... unset old entry by _key, insert new entry
  await tx.commit({ autoGenerateArrayKeys: true })
})
```

### Blueprint configuration

The Function is configured via a Sanity Blueprint at `studio/sanity.blueprint.ts`:

```ts
import { defineBlueprint } from '@sanity/blueprints'
import { defineDocumentFunction } from '@sanity/blueprints'

const routeSyncFunction = defineDocumentFunction({
  name: 'route-sync',
  event: {
    on: ['create', 'update', 'delete'],
    filter: `_type in ["blogPost", "article"]`,
    projection: `{ _id, _type, slug }`,
    // includeDrafts: false (default) — only fires on published changes
    // includeAllVersions: false (default) — only published versions
  },
})

export default defineBlueprint({
  resources: [routeSyncFunction],
})
```

Or use the package's `defineRouteSyncBlueprint()` to generate the config from your route config:

```ts
import { defineRouteSyncBlueprint } from '@sanity/routes/blueprint'

const blueprint = defineRouteSyncBlueprint({
  channel: 'web',
  types: ['article', 'blogPost'],
})
```

### Deploy and test

```bash
# Deploy the Function
cd studio
npx sanity blueprints deploy

# Test with a specific document
npx sanity functions test route-sync --document-id article-installation --event update

# View logs
npx sanity functions logs route-sync
```

### Design decisions

**Recursion-safe.** Route map documents have type `routes.map` — they never match the Function's filter (`_type in ["blogPost", "article"]`). No infinite loops.

**Draft-safe by default.** `includeDrafts: false` is the default — the Function only fires when documents are published, not on every keystroke in the Studio.

**Single-transaction upsert.** The `createIfNotExists` + `unset` + `insert` pattern is atomic. No race conditions between concurrent publishes. `autoGenerateArrayKeys` handles key generation.

**`_key`-based mutations.** Array entry removal uses `entries[_key=="..."]` instead of nested property filters like `entries[doc._ref=="..."]`. The latter causes parse errors in Sanity's mutation engine.

---

## Frontend Integration

### Next.js with `defineLive`

```ts
// lib/routes.ts
import { createRouteResolver } from '@sanity/routes/resolver'
import { client } from './sanity.client'

export const routeResolver = createRouteResolver(client, 'web')
```

```tsx
// app/blog/page.tsx — Server Component
import { routeResolver } from '@/lib/routes'
import { client } from '@/lib/sanity.client'

export default async function BlogIndex() {
  const pathField = await routeResolver.groqField('blogPost')

  const posts = await client.fetch(
    `*[_type == "blogPost"] | order(publishedAt desc) {
      _id,
      title,
      excerpt,
      ${pathField}
    }`
  )

  return (
    <ul>
      {posts.map((post) => (
        <li key={post._id}>
          <a href={post.path}>{post.title}</a>
          <p>{post.excerpt}</p>
        </li>
      ))}
    </ul>
  )
}
```

### Portable Text link resolution

```tsx
// components/PortableText.tsx
import { PortableText } from '@portabletext/react'
import { routeResolver } from '@/lib/routes'

// Load once at the page level
const urlMap = await routeResolver.preload()

const components = {
  marks: {
    internalLink: ({ value, children }) => {
      const url = urlMap.get(value.reference._ref)
      if (!url) return <span>{children}</span>
      return <a href={url}>{children}</a>
    },
  },
}

export function Body({ content }) {
  return <PortableText value={content} components={components} />
}
```

### MCP / AI agent integration

```ts
// In your MCP tool handler
import { createRouteResolver } from '@sanity/routes/resolver'

const resolver = createRouteResolver(client, 'web')

async function getDocumentUrl(documentId: string) {
  const url = await resolver.resolveById(documentId)
  if (!url) throw new Error(`No route found for document ${documentId}`)
  return url
}

// AI agent asks: "What's the URL for the Agent Context article?"
// MCP resolves: "https://www.sanity.io/docs/ai/agent-context" ✓
// Not:          "https://www.sanity.io/docs/agent-context"     ✗ (404)
```

---

## Project Structure

```
url-resolution-poc/
├── packages/
│   └── routes/                    # @sanity/routes package
│       └── src/
│           ├── index.ts           # Public API exports
│           ├── plugin.ts          # routesPlugin() — Sanity plugin
│           ├── schema.ts          # routes.config + routes.map schema types
│           ├── resolver.ts        # createRouteResolver() — realtime + static
│           ├── build.ts           # buildRouteMap() — bulk shard generation
│           ├── blueprint.ts       # defineRouteSyncBlueprint()
│           ├── types.ts           # Shared TypeScript types
│           └── components/        # Custom input components
│               ├── RouteEntryInput.tsx
│               ├── DocumentTypePicker.tsx
│               └── PathExpressionField.tsx
├── studio/                        # Sanity Studio + Functions
│   ├── sanity.config.ts
│   ├── sanity.blueprint.ts
│   ├── schemas/                   # article, blogPost, docsNavSection
│   └── functions/route-sync/      # Sync Function (keeps map updated)
├── frontend/                      # Next.js 16 app (semantic HTML)
│   ├── lib/
│   │   ├── sanity.ts              # Sanity client
│   │   ├── routes.ts              # Resolver instances
│   │   └── live.ts                # defineLive setup
│   ├── components/
│   │   ├── PortableTextBody.tsx   # PT renderer with link resolution
│   │   └── CodeBlock.tsx          # Syntax-highlighted code blocks
│   └── app/                       # Pages
├── scripts/                       # Seed content, build map
├── README.md
└── package.json                   # pnpm workspaces monorepo
```

### Package exports

```json
{
  "name": "@sanity/routes",
  "exports": {
    "./resolver": "./src/resolver/index.ts",
    "./plugin": "./src/plugin/index.ts"
  }
}
```

`./resolver` — No React dependency. Safe for Server Components, edge functions, Node.js scripts.
`./plugin` — Depends on `sanity` (and therefore React). Studio-only.

---

## Known Limitations

This is a proof of concept. Here's what's not solved yet:

### Parent fan-out
When a parent document (e.g., `docsNavSection`) changes its slug, all child documents' URLs change. The current implementation doesn't automatically detect and propagate this. The route map needs to be regenerated.

### Static mode filter
The static route map (`routes.map`) doesn't yet support filtering by document type or path prefix. `preload()` loads the entire map. For very large sites (10k+ documents), this may need pagination or type-scoped loading.

### No nested routes
Routes are flat — `basePath` + resolved path. There's no support for deeply nested route trees (e.g., `/docs/section/subsection/article`). The `parentSlug` mode handles one level of nesting.

### Single dataset
The resolver assumes one dataset. Cross-dataset route resolution isn't supported.

---

## What This Enables

The route system is a foundation. Here's what becomes easy to build on top of it — each of these is an afternoon project, not a quarter-long initiative.

### Link Health Checks

The route map uses weak references. When a document is deleted, its `_ref` dangles — and you can query for that:

```groq
// Find all stale route entries (document was deleted but entry remains)
*[_type == "routes.map"]{
  _id,
  "staleEntries": entries[!defined(doc->)]{ path, doc }
}[count(staleEntries) > 0]
```

A scheduled Function runs this daily, flags stale entries, and optionally generates redirects. No separate deletion tracking — just query for dangling refs.

### Automatic Redirects

When a slug changes, the sync Function can detect the old path and create a redirect:

```ts
// In the sync handler, before updating the entry:
const oldEntry = shard.entries.find(e => e.doc._ref === docId)
if (oldEntry && oldEntry.path !== newPath) {
  await client.create({
    _type: 'routes.redirect',
    channel: 'web',
    fromPath: `${basePath}/${oldEntry.path}`,
    toPath: `${basePath}/${newPath}`,
    createdAt: new Date().toISOString(),
  })
}
```

The frontend or CDN reads `routes.redirect` documents to serve 301s. Content editors rename slugs freely — redirects happen automatically.

### Sitemap Generation

`preload()` gives you every URL in one query:

```ts
const resolver = createRouteResolver(client, 'web', { mode: 'static' })
const urlMap = await resolver.preload()

const sitemap = Array.from(urlMap.entries()).map(([id, url]) => ({
  loc: url,
  lastmod: new Date().toISOString(),
}))
// → Write to sitemap.xml
```

A CI job or scheduled Function generates `sitemap.xml` from the route map. Always in sync with published content. No crawling required.

### Cross-Document Link Validation

Portable Text internal links carry `_ref` IDs. Combined with the route map, you can validate every internal link across your entire content corpus:

```groq
// Find all PT internal links and check if they resolve to a route
*[defined(body)]{
  _id,
  title,
  "brokenLinks": body[].markDefs[_type == "internalLink"]{
    "targetId": reference._ref,
    "hasRoute": count(
      *[_type == "routes.map" && ^.reference._ref in entries[].doc._ref]
    ) > 0
  }[!hasRoute]
}[count(brokenLinks) > 0]
```

Run this as a validation rule, a scheduled check, or a CI gate. Catch broken internal links before they reach production.

### MCP / AI Agent Integration

The MCP's `linkResolver` can use the same system as the frontend — no separate URL logic:

```ts
// In your MCP tool handler
import { createRouteResolver } from '@sanity/routes/resolver'

const resolver = createRouteResolver(client, 'web')

async function getDocumentUrl(documentId: string) {
  const url = await resolver.resolveById(documentId)
  if (!url) throw new Error(`No route found for ${documentId}`)
  return url
}

// AI agent asks: "What's the URL for the Agent Context article?"
// MCP resolves: "https://www.sanity.io/docs/ai/agent-context" ✓
// Not:          "https://www.sanity.io/docs/agent-context"     ✗ (404)
```

Zero-token resolution means the MCP doesn't need credentials to resolve URLs on public datasets.

### Multi-Channel Publishing

Same document, different URLs per channel. Each channel gets its own route config:

```json
[
  {
    "_type": "routes.config",
    "channel": "web",
    "routes": [{ "types": ["article"], "basePath": "/docs" }]
  },
  {
    "_type": "routes.config",
    "channel": "mobile",
    "routes": [{ "types": ["article"], "basePath": "/m/docs" }]
  }
]
```

```ts
const webResolver = createRouteResolver(client, 'web')
const mobileResolver = createRouteResolver(client, 'mobile')

await webResolver.resolveById('article-installation')
// → "https://www.sanity.io/docs/getting-started/installation"

await mobileResolver.resolveById('article-installation')
// → "https://m.sanity.io/m/docs/getting-started/installation"
```

The content team publishes once. URLs adapt per platform.

---

## Sanity Project

This POC runs against a real Sanity project with production content:

| | |
|---|---|
| **Project ID** | `bb8k7pej` |
| **Dataset** | `production` |
| **Studio** | Included in `apps/studio/` |

The dataset is public — you can test the resolver without any credentials:

```ts
const client = createClient({
  projectId: 'bb8k7pej',
  dataset: 'production',
  useCdn: true,
  apiVersion: '2024-01-01',
})
```

---

## License

MIT
