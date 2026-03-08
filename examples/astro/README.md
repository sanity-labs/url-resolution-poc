# Astro Example — @sanity/routes

Astro integration for the URL Resolution POC. Static-first framework with zero serialization boundary.

## Setup

```bash
# From the monorepo root
pnpm install

# Copy environment variables
cp examples/astro/.env.example examples/astro/.env
# Edit .env and add your SANITY_API_READ_TOKEN

# Build the package first
pnpm --filter @sanity/routes build

# Start dev server
pnpm --filter example-astro dev
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SANITY_API_READ_TOKEN` | Yes | Sanity read token — route map shards are private docs |
| `SANITY_ROUTES_ENV` | No | Route environment (default: `production`) |

## Architecture

- **`@sanity/astro`** — provides `sanityClient` via `sanity:client` virtual module for public content queries
- **`authenticatedClient`** — separate `@sanity/client` instance with token for private route map shards
- **`astro-portabletext`** — Portable Text rendering with slots approach for internal links
- **`src/middleware.ts`** — redirect handling with `getRedirects({ cacheTtl: 60_000 })`
- **`output: 'server'`** — required for middleware; pages can opt into prerendering

## TypeGen

```bash
pnpm --filter example-astro typegen
```

Generates `src/lib/sanity.types.ts` from the studio schema.
