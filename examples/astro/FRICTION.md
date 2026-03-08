# Astro Integration — Friction Log

Findings from integrating `@sanity/routes` with Astro (sixth framework example, static-first).

## No Serialization Boundary — Cleanest Integration

| Severity | Integration Point | Finding |
|----------|------------------|---------|
| **None** | `preload()` return type | Astro renders everything server-side in frontmatter. There is NO serialization boundary — `Record<string, string>` is used directly in the template. No JSON, no devalue, no custom serializer. This is the cleanest framework for our API. `Map` would have worked too since there's no serialization step. |

## Frontmatter Fetching — Zero Boilerplate

| Severity | Integration Point | Finding |
|----------|------------------|---------|
| **None** | Data loading | Astro frontmatter is server-only by default. No composables, no loaders, no server functions — just `await` at the top of the file. `Promise.all([sanityClient.fetch(...), resolver.preload()])` works directly. Simplest data loading pattern of any framework. |

## sanity:client Virtual Module — Clean Setup (with caveat)

| Severity | Integration Point | Finding |
|----------|------------------|---------|
| **Low** | Resolver setup | `@sanity/astro` provides `sanityClient` via the `sanity:client` virtual module. One import, pre-configured. However, the virtual module doesn't easily support passing a token via environment variables — `astro.config.mjs` runs at build time where `import.meta.env` may not be fully available. For authenticated access (needed for route map shards with dots in their IDs), we created a separate `@sanity/client` instance with the token. This means two clients: `sanityClient` from `sanity:client` for public content queries, and `authenticatedClient` from `@sanity/client` for route resolution. Minor friction, but worth noting. |

## Middleware — Perfect Redirect Hook

| Severity | Integration Point | Finding |
|----------|------------------|---------|
| **None** | `getRedirects()` | `src/middleware.ts` with `defineMiddleware` runs on every request. `context.redirect(destination, statusCode)` is a one-liner. Same quality as Nuxt's server middleware. |

## Portable Text — Slots Pattern for Context

| Severity | Integration Point | Finding |
|----------|------------------|---------|
| **Low** | PT internal links | `astro-portabletext` uses a **slots approach** for custom marks. The `<fragment slot="mark">` callback has access to the parent scope, so `urlMap` is available without prop drilling. Different from React (JSX components) and Vue (`h()` render functions), but idiomatic Astro. The pattern is clean once you know it, but not obvious from the README alone. |

## output: 'server' Required for Middleware

| Severity | Integration Point | Finding |
|----------|------------------|---------|
| **Low** | Rendering mode | Astro's default static mode doesn't run middleware. Need `output: 'server'` in `astro.config.mjs` for the redirect middleware to work. Individual pages can still opt into prerendering with `export const prerender = true`. Minor config requirement. |

## Overall

Astro is the **simplest integration** of all 6 frameworks. No serialization boundary, no composables, no loaders — just server-side code in frontmatter. The `@sanity/routes` API maps directly to Astro's model with zero adaptation.

### Cross-Framework Comparison

| Framework | Resolver Setup | Data Loading | Redirects | Serializer | PT Links | Extra Files |
|-----------|---------------|-------------|-----------|------------|----------|-------------|
| Next.js | lib/ module | RSC (server) | middleware.ts | N/A (RSC) | JSX | 0 |
| SvelteKit | lib/ module | +page.server.ts | hooks.server.ts | devalue | Svelte context | 0 |
| React Router | lib/ module | loader (server) | entry.server.tsx | JSON | JSX | 0 |
| TanStack Start | lib/ module | createServerFn | beforeLoad | Custom | JSX | 1 (server-fns.ts) |
| Nuxt | server/utils/ | useAsyncData | server/middleware/ | devalue | Vue h() | 0 |
| **Astro** | **lib/ module** | **frontmatter** | **middleware.ts** | **None** | **Astro slots** | **0** |
