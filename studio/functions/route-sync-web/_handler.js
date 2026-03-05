import { documentEventHandler } from '@sanity/functions';
import { createClient } from '@sanity/client';
/**
 * Creates a Sanity Function handler that keeps route map shards
 * in sync when routable documents change.
 *
 * @param channel - The route config channel (e.g., 'web')
 * @returns A documentEventHandler for use in Sanity Functions
 *
 * @example
 * ```ts
 * // studio/functions/route-sync/index.ts
 * import { createRouteSyncHandler } from '@sanity/routes'
 * export const handler = createRouteSyncHandler('web')
 * ```
 */
export function createRouteSyncHandler(channel) {
    return documentEventHandler(async ({ context, event }) => {
        const client = createClient({
            ...context.clientOptions,
            apiVersion: '2024-01-01',
            useCdn: false,
        });
        const docId = event.data._id;
        const docType = event.data._type;
        // 1. Fetch route config from Content Lake
        const config = await client.fetch(`*[_type == "routes.config" && channel == $channel][0]`, { channel });
        if (!config) {
            console.error(`[@sanity/routes] No route config found for channel "${channel}"`);
            return;
        }
        // 2. Check if this is a parent type change (e.g., docsNavSection slug changed)
        //    If so, find all child documents that depend on this parent and re-sync them
        const parentRoutes = config.routes.filter((r) => r.mode === 'parentSlug' && r.parentType === docType);
        if (parentRoutes.length > 0) {
            console.log(`[@sanity/routes] Parent type "${docType}" changed — re-syncing child types`);
            for (const route of parentRoutes) {
                let childIds = [];
                if (route.parentRelationship === 'parentReferencesChild') {
                    // Parent document contains references to children (e.g., docsNavSection.articles[])
                    // Query the parent document for all reference fields, extract child IDs
                    const parent = await client.fetch(`*[_id == $parentId][0]`, { parentId: docId });
                    if (parent) {
                        // Walk all fields to find references to child types
                        childIds = extractRefs(parent).filter((ref) => ref !== docId);
                    }
                }
                else {
                    // Child documents reference the parent (childReferencesParent)
                    const childTypes = route.types;
                    const typeFilter = childTypes.map((t) => `"${t}"`).join(', ');
                    const children = await client.fetch(`*[_type in [${typeFilter}] && references($parentId)]{ _id }`, { parentId: docId });
                    childIds = (children || []).map((c) => c._id);
                }
                for (const childId of childIds) {
                    // Verify the child is a routable type before syncing
                    const childDoc = await client.fetch(`*[_id == $id][0]{ _type }`, { id: childId });
                    if (childDoc && route.types.includes(childDoc._type)) {
                        await syncSingleDocument(client, route, channel, childId, childDoc._type);
                    }
                }
                // Also re-sync any children that were REMOVED from the parent
                // (they're still in the route map but no longer in the parent's refs)
                for (const childType of route.types) {
                    const shardId = `routes-${channel}-${childType}`;
                    const shard = await client.fetch(`*[_id == $shardId][0]{ entries }`, { shardId });
                    if (shard?.entries) {
                        for (const entry of shard.entries) {
                            const entryRef = entry.doc?._ref;
                            if (entryRef && !childIds.includes(entryRef)) {
                                // This entry is in the shard but NOT in the parent's refs anymore
                                // Re-sync it — the pathExpression will resolve without the parent prefix
                                await syncSingleDocument(client, route, channel, entryRef, childType);
                                console.log(`[@sanity/routes] Re-synced orphaned child ${entryRef}`);
                            }
                        }
                    }
                }
                console.log(`[@sanity/routes] Re-synced ${childIds.length} child document(s) for parent ${docId}`);
            }
            return;
        }
        // 3. Find the route entry for this document type (direct sync)
        const routeEntry = config.routes.find((r) => r.types.includes(docType));
        if (!routeEntry) {
            console.log(`[@sanity/routes] No route entry for type "${docType}" in channel "${channel}"`);
            return;
        }
        // 4. Handle delete → remove entry by _key
        if (event.type === 'delete') {
            const shard = await client.fetch(`*[_id == $shardId][0]{ "entryKey": entries[doc._ref == $docId][0]._key }`, { shardId: `routes-${channel}-${docType}`, docId });
            if (shard?.entryKey) {
                await client
                    .patch(`routes-${channel}-${docType}`)
                    .unset([`entries[_key=="${shard.entryKey}"]`])
                    .commit();
                console.log(`[@sanity/routes] Removed ${docId} from routes-${channel}-${docType}`);
            }
            return;
        }
        // 5. Sync this document
        await syncSingleDocument(client, routeEntry, channel, docId, docType);
    });
}
/**
 * Sync a single document's route map entry.
 * @internal
 */
async function syncSingleDocument(client, routeEntry, channel, docId, docType) {
    const shardId = `routes-${channel}-${docType}`;
    const pathExpression = routeEntry.pathExpression || 'slug.current';
    const result = await client.fetch(`*[_id == $docId][0]{ "path": ${pathExpression} }`, { docId });
    if (!result?.path) {
        console.error(`[@sanity/routes] Could not resolve path for ${docId}`);
        return;
    }
    const shard = await client.fetch(`*[_id == $shardId][0]{ "entryKey": entries[doc._ref == $docId][0]._key }`, { shardId, docId });
    const tx = client
        .transaction()
        .createIfNotExists({
        _id: shardId,
        _type: 'routes.map',
        channel,
        documentType: docType,
        basePath: routeEntry.basePath,
        entries: [],
    });
    if (shard?.entryKey) {
        tx.patch(shardId, (p) => p.unset([`entries[_key=="${shard.entryKey}"]`]));
    }
    tx.patch(shardId, (p) => p.insert('after', 'entries[-1]', [
        {
            doc: { _ref: docId, _type: 'reference', _weak: true },
            path: result.path,
        },
    ]));
    await tx.commit({ autoGenerateArrayKeys: true });
    console.log(`[@sanity/routes] Synced ${docId} → ${routeEntry.basePath}/${result.path}`);
}
/**
 * Recursively extract all _ref values from a document.
 * Used to find child document IDs when the parent references children.
 * @internal
 */
function extractRefs(obj) {
    const refs = [];
    if (!obj || typeof obj !== 'object')
        return refs;
    if (obj._ref)
        refs.push(obj._ref);
    for (const val of Object.values(obj)) {
        if (Array.isArray(val)) {
            for (const item of val) {
                refs.push(...extractRefs(item));
            }
        }
        else if (val && typeof val === 'object') {
            refs.push(...extractRefs(val));
        }
    }
    return refs;
}
//# sourceMappingURL=handler.js.map