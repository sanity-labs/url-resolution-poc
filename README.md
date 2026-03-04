# URL Resolution POC

Proof of concept for two-tier URL resolution for Sanity structured content.

**Problem:** Sanity documents don't know their own URLs. Every system that needs a document-to-URL mapping (MCP, Presentation tool, frontends, sitemaps) reinvents the solution independently.

**Solution:** A route config document in the Content Lake defines GROQ path expressions per type. A `@sanity/routes` package reads this config and provides instant URL resolution.

## Architecture

```
Route Config (_.routes.web)          ← Source of truth: GROQ path expressions
    │                    │
    ▼ (realtime)         ▼ (static)
  Resolver            Sync Function → Route Map (pre-computed)
  evaluates GROQ                        │
  live                                  ▼
                                    Resolver reads
                                    from map shards
```

**Two resolution modes:**
- **Realtime** (primary): Evaluates GROQ path expressions live against the Content Lake. Always fresh.
- **Static** (optimization): Reads from pre-computed route map shards. Fast, CDN-cacheable. Used for bulk operations, sitemaps, and Portable Text link resolution via `preload()`.

## Quick Start

```bash
# Install dependencies
pnpm install

# Build the @sanity/routes package
pnpm --filter @sanity/routes build

# Seed content (articles, blog posts, nav sections, route config)
cd studio && SANITY_WRITE_TOKEN=<token> npx sanity exec ../scripts/seed-content.mjs --with-user-token

# Build route map shards (for static mode)
cd studio && SANITY_WRITE_TOKEN=<token> npx sanity exec ../scripts/build-map.mjs --with-user-token

# Run the frontend
cd frontend && npm run dev
```

## Project Structure

```
├── packages/routes/          # @sanity/routes package
│   └── src/
│       ├── plugin.ts         # routesPlugin() — Sanity plugin
│       ├── schema.ts         # routes.config schema type
│       ├── resolver.ts       # createRouteResolver() — realtime + static
│       ├── build.ts          # buildRouteMap() — bulk shard generation
│       └── blueprint.ts      # defineRouteSyncBlueprint()
├── studio/                   # Sanity Studio + Functions
│   ├── sanity.config.ts      # Studio config with routesPlugin()
│   ├── schemas/              # article, blogPost, docsNavSection
│   └── functions/route-sync/ # Sync Function (keeps map updated)
├── frontend/                 # Next.js app (semantic HTML)
│   ├── lib/routes.ts         # Resolver instances
│   └── app/                  # Pages with PT link resolution
└── scripts/                  # Seed content, build map
```

## Key Concepts

### Route Config Document

The route config is a Sanity document (`routes.config` type) that defines URL patterns:

```json
{
  "_type": "routes.config",
  "channel": "web",
  "baseUrls": [
    { "name": "production", "url": "https://www.sanity.io", "isDefault": true },
    { "name": "development", "url": "http://localhost:3000" }
  ],
  "routes": [
    { "types": ["blogPost"], "basePath": "/blog", "pathExpression": "slug.current" },
    {
      "types": ["article"],
      "basePath": "/docs",
      "pathExpression": "coalesce(*[_type == \"docsNavSection\" && references(^._id)][0].slug.current + \"/\", \"\") + slug.current"
    }
  ]
}
```

The resolver finds this document by `_type + channel` query — the document ID is not prescribed.

### Resolver Usage

```ts
import { createRouteResolver } from '@sanity/routes'

// Realtime mode — evaluates GROQ live
const resolver = createRouteResolver(client, 'web', { mode: 'realtime' })
const url = await resolver.resolveById('article-agent-context')
// → "https://www.sanity.io/docs/ai/agent-context"

// Static mode — reads from pre-computed map
const staticResolver = createRouteResolver(client, 'web', { mode: 'static' })
const urlMap = await staticResolver.preload()
// → Map<docId, fullUrl> for synchronous lookup
```

### Portable Text Link Resolution

The "eating of the pudding" — PT internal links carry only a `_ref`. The resolver turns them into URLs:

```tsx
const [post, urlMap] = await Promise.all([
  client.fetch(`*[_type == "blogPost" && slug.current == $slug][0]{ title, body }`, { slug }),
  resolver.preload(),
])

<PortableText
  value={post.body}
  components={{
    marks: {
      internalLink: ({ value, children }) => {
        const url = urlMap.get(value.reference._ref)
        return url ? <a href={url}>{children}</a> : <span>{children}</span>
      },
    },
  }}
/>
```

### Route Map (Static Mode)

Pre-computed shards maintained by `buildRouteMap()` or the sync Function:

```json
{
  "_id": "routes.web.article",
  "_type": "routes.map",
  "entries": [
    { "doc": { "_ref": "article-agent-context", "_weak": true }, "path": "ai/agent-context" }
  ]
}
```

Rebuild manually: `node scripts/build-map.mjs`
Automated sync: Deploy the route-sync Function via `sanity blueprints deploy`

## Sanity Project

- **Project ID:** `bb8k7pej`
- **Dataset:** `production`
- **Organization:** Sanity

## Known Limitations

1. **Parent document fan-out:** Changing a `docsNavSection` slug doesn't auto-update child article paths in the route map. Realtime mode is unaffected. Recovery: `resolver.rebuildType('article')`.
2. **Static Function filter:** Adding new routable types requires redeploying the Function.
3. **Realtime mode cost:** Each `resolveById()` runs a GROQ query with a join. Use static mode + `preload()` for bulk.
