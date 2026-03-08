# SPA Example — @sanity/routes

Client-side only SPA using Vite + React Router. No SSR, no server middleware, no tokens.

## Setup

```bash
# From the monorepo root
pnpm install

# Build the package first
pnpm --filter @sanity/routes build

# Start dev server
pnpm --filter example-spa dev
```

## Architecture

- **Pure client-side** — all data fetching happens in the browser
- **No tokens needed** — route map shard IDs use hyphens (public documents)
- **CDN-backed** — `useCdn: true` for fast reads
- **Client-side redirects** — `getRedirects({ cacheTtl: 60_000 })` checked in root loader
- **React Router library mode** — `createBrowserRouter` (not framework/SSR mode)

## Environment Variables

All optional — defaults are built in.

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_SANITY_PROJECT_ID` | `bb8k7pej` | Sanity project ID |
| `VITE_SANITY_DATASET` | `production` | Dataset name |
| `VITE_SANITY_ROUTES_ENV` | `production` | Route environment |

## TypeGen

```bash
pnpm --filter example-spa typegen
```

Generates `src/lib/sanity.types.ts` from the studio schema.
