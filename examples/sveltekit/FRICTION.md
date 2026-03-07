# SvelteKit Integration — Friction Log

Findings from integrating `@sanity/routes` with SvelteKit.

## Map Serialization

**Severity:** Low (SvelteKit), High (other frameworks)

`resolver.preload()` returns `Map<string, string>`. SvelteKit uses `devalue` for load function serialization, which handles Maps natively — so passing a Map from `+page.server.ts` to the page component works without conversion.

However, frameworks that use JSON serialization (Remix, Astro) would need `Object.fromEntries(urlMap)`. If `preload()` returned `Record<string, string>` instead of `Map`, it would work everywhere without framework-specific knowledge.

## PT Link Resolution Pattern

**Severity:** Low

The `preload()` → synchronous lookup pattern works well in SvelteKit. The urlMap is loaded in the server load function and passed to components via Svelte context (`setContext`/`getContext`). This is idiomatic Svelte.

The React example passes urlMap as a prop. The Svelte example uses context because PT mark components don't receive arbitrary props — they get `portableText` context from the library. This is a framework difference, not an API friction.

## Redirect Caching

**Severity:** Medium

`getRedirects()` fetches from Sanity on every call. In SvelteKit's `hooks.server.ts`, the handle function runs on every request. The developer must build their own in-memory cache (as shown in the example).

Consider: a `getRedirects({ cacheTtl: 60_000 })` option that handles caching internally, similar to the resolver's `cacheTtl` option.

## Overall Assessment

The `@sanity/routes` API feels natural in SvelteKit. The resolver setup is identical to Next.js. The main adaptation is PT link resolution (context vs props), which is a framework idiom difference, not an API issue.
