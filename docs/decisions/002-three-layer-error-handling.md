# ADR-002: Three-Layer Error Handling

**Status:** Accepted
**Date:** 2026-03-06
**Authors:** @lead, @developer, @educator, @knut

## Context

`resolveUrlById` returns `null` when resolution fails. This is safe for batch calls (`resolveUrlByIds`) — one failure doesn't abort the rest — but it gives the caller no information about why it failed. Was the document missing? The type not configured? The route map empty? In production, silent nulls are fine. In development, they cause hours of debugging.

Throwing on failure would fix the information problem but break batch calls. A `Result<T, E>` type would preserve both, but adds ceremony to every call site for what is ultimately a URL lookup.

## Decision

Three layers of error visibility, all opt-in:

**Layer 1 — Production default:** `null` return, silent. Safe for batches. Zero overhead.

**Layer 2 — Development warnings:** Pass `warn: true` to get descriptive console warnings. Intended for `process.env.NODE_ENV !== 'production'`.

**Layer 3 — Observability callback:** Pass `onResolutionError` for Sentry, Datadog, or custom logging.

```ts
// Production — silent null, route errors go to Sentry
const resolver = createRouteResolver(client, 'web', {
  onResolutionError: (error) => {
    Sentry.captureMessage(error.message, { extra: error })
  },
})

// Development — console warnings
const resolver = createRouteResolver(client, 'web', {
  warn: process.env.NODE_ENV !== 'production',
})
// Console: ⚠️ [@sanity/routes] No route entry for type "article". Available: blogPost, page.

// Deep debugging — call diagnose() directly
const diagnosis = await resolver.diagnose('my-doc')
// → { status: 'no_route_entry', documentId: 'my-doc', documentType: 'article', ... }
```

**`diagnose(id)` returns one of 6 statuses:** `resolved`, `document_not_found`, `no_route_entry`, `empty_path`, `no_config`, `shard_not_found`. It is only called internally when `warn` or `onResolutionError` is set — zero overhead in production when neither is configured.

## Consequences

- **Good:** Production behavior is silent and batch-safe by default. Development experience is descriptive. Observability is opt-in without coupling the package to any specific logging library. `diagnose()` gives contributors a precise debugging tool.
- **Neutral:** Three configuration options to document. The `warn` flag is a boolean, so it can't carry structured context — that's what `onResolutionError` is for.
- **Bad:** Developers who don't read the docs may ship with no error visibility and wonder why URLs are silently null in production.

## Alternatives Considered

**Throw on failure:** Breaks `resolveUrlByIds` — one bad document aborts the entire batch. Unacceptable for sitemap generation over thousands of documents.

**`Result<string | null, ResolutionError>` return type:** Preserves both the value and the error at every call site. Rejected as over-engineering for URL resolution — most callers just want the URL or null, not a discriminated union to unwrap.

**Always warn in development (auto-detect):** Checking `NODE_ENV` inside the package couples it to Node.js conventions and surprises edge runtime users. Explicit `warn: true` is clearer.
