# ADR-005: Weak References for Route Map Entries

**Status:** Accepted
**Date:** 2026-03-06
**Authors:** @lead, @developer, @educator, @knut

## Context

Route map shards (`routes.map` documents) contain entries that reference content documents. Each entry is a `{ doc: reference, path: string }` pair. The reference connects a document ID to its resolved URL path.

If these are strong references, Sanity's referential integrity rules prevent deleting a content document while a route map entry points to it. The editor sees a "document has references" error and can't delete. Alternatively, if the sync handler fails to clean up on delete, the shard holds a dangling reference indefinitely.

## Decision

Use weak references (`_weak: true`) for all route map entries:

```ts
// Sync handler — upsert on create/update
await client.transaction()
  .createIfNotExists({ _id: shardId, _type: 'routes.map', entries: [] })
  .patch(shardId, p => p
    .unset([`entries[doc._ref=="${docId}"]`])
    .insert('after', 'entries[-1]', [{
      doc: { _ref: docId, _type: 'reference', _weak: true },  // ← weak
      path: result.path,
    }])
  )
  .commit({ autoGenerateArrayKeys: true })
```

This means:

1. **Deleted documents don't block deletion.** The editor deletes a blog post; the route map entry becomes stale but doesn't prevent the delete.
2. **Sanity's `references()` function still works.** You can query `*[references("some-doc-id")]` to find which route map shards include a document. Reference tooling in Studio works as expected.
3. **Stale entries are detectable.** A weak reference to a deleted document resolves to `null` in GROQ. The resolver can detect and skip these entries rather than returning a URL for a document that no longer exists.

The sync handler removes entries on delete events — weak references are a safety net for missed events, not the primary cleanup mechanism.

## Consequences

- **Good:** Content editors can delete documents without hitting reference integrity errors. Stale entries are detectable via GROQ null-coalescing. Sanity's reference tooling (Studio "used in" panel, `references()` queries) continues to work.
- **Neutral:** The route map may contain stale entries between a delete event and the next sync handler run. In practice this window is seconds. The resolver skips null-resolving weak refs, so stale entries don't produce wrong URLs.
- **Bad:** Weak references are less visible in Studio than strong references — the "used in" panel may not surface route map entries as prominently. Contributors unfamiliar with `_weak` semantics may be surprised that deleting a document doesn't error.

## Alternatives Considered

**Strong references:** Prevents deletion of any document with a route map entry. Editors hit confusing "document has references" errors from a system document they can't see. Rejected.

**No references (store only the `_id` string):** Loses Sanity's reference tooling entirely. Can't use `references()` in GROQ to find which shards contain a document. Makes cleanup queries harder to write. Rejected.

**External tracking (separate cleanup table):** Track document-to-shard relationships in a separate data structure. Another system to maintain, with its own consistency problems. Rejected — weak references give us the same safety net for free.
