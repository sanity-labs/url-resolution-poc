# ADR-003: URL Normalization Strategy

**Status:** Accepted
**Date:** 2026-03-06
**Authors:** @lead, @developer, @educator, @knut

## Context

Route config documents can be created from multiple sources: Studio UI, API calls, migration scripts, seed scripts, or direct imports. Each source has different slash conventions. A `basePath` might arrive as `"blog"`, `"/blog"`, `"/blog/"`, or `"blog/"`. A base URL might have a trailing slash or not. Path expressions might return paths with or without a leading slash.

If the resolver trusts its inputs, a single misconfigured document produces wrong URLs silently. If it rejects bad input, it creates friction for every integration that doesn't happen to match the expected format.

## Decision

**"Normalize on write where possible, normalize on read as defense."**

`assembleUrl()` — the internal function that builds a full URL from parts — applies these rules unconditionally:

- `basePath`: ensure leading slash, strip trailing slash (`"blog/"` → `"/blog"`)
- Base URL: strip trailing slash (`"https://example.com/"` → `"https://example.com"`)
- Path from `pathExpression`: ensure leading slash (`"my-post"` → `"/my-post"`)

Result: `https://example.com` + `/blog` + `/my-post` → `https://example.com/blog/my-post`

`normalizeUrl()` — used by `resolveDocumentByUrl` before shard lookup — strips query params, fragments, and trailing slashes so that `https://example.com/blog/post?utm_source=x#section` and `/blog/post` both resolve to the same document.

The sync handler strips the leading slash from paths before writing to route map shards (shard entries store `"my-post"`, not `"/my-post"`). This keeps shard data consistent regardless of what the `pathExpression` returns.

```ts
// All of these produce the same URL:
// basePath: "blog" | "/blog" | "/blog/" | "blog/"
// baseUrl: "https://example.com" | "https://example.com/"
// path from expression: "my-post" | "/my-post"

assembleUrl('https://example.com/', 'blog/', 'my-post')
// → "https://example.com/blog/my-post"

assembleUrl('https://example.com', '/blog', '/my-post')
// → "https://example.com/blog/my-post"
```

## Consequences

- **Good:** The resolver produces correct URLs regardless of how the config was created. Integrations don't need to know the expected slash format. `resolveDocumentByUrl` handles real-world URLs with query params and fragments.
- **Neutral:** Normalization happens on every URL assembly — negligible cost. Shard entries store paths without leading slashes, which is a convention contributors must know.
- **Bad:** Normalization silently accepts malformed input. A `basePath` of `"//blog"` or `"blog//posts"` will produce a wrong URL rather than a validation error. Double-slash paths are not normalized.

## Alternatives Considered

**Strict validation only:** Reject any `basePath` that doesn't start with `/` and end without `/`. Clean data, but bad DX — every integration breaks until it matches the exact format. Rejected.

**Normalize only on read:** Don't touch shard data, normalize everything at query time. Shard entries stay messy and inconsistent across sources. Makes debugging harder. Rejected.

**Normalize only on write:** Handler normalizes before writing to shards, but `assembleUrl` trusts its inputs. Doesn't protect against config created via the API after the handler runs. Rejected.
