import {documentEventHandler} from '@sanity/functions'
import {createClient} from '@sanity/client'

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
export function createRouteSyncHandler(channel: string) {
  return documentEventHandler(async ({context, event}: {context: any; event: any}) => {
    const client = createClient({
      ...context.clientOptions,
      apiVersion: '2024-01-01',
      useCdn: false,
    })

    const docId = event.data._id
    const docType = event.data._type

    // 1. Fetch route config from Content Lake
    const config = await client.fetch(
      `*[_type == "routes.config" && channel == $channel][0]`,
      {channel},
    )
    if (!config) {
      console.error(`[@sanity/routes] No route config found for channel "${channel}"`)
      return
    }

    // 2. Check if this is a parent type change (e.g., docsNavSection slug changed)
    //    If so, find all child documents that depend on this parent and re-sync them
    const parentRoutes = config.routes.filter(
      (r: any) => r.mode === 'parentSlug' && r.parentType === docType,
    )

    if (parentRoutes.length > 0) {
      console.log(
        `[@sanity/routes] Parent type "${docType}" changed — re-syncing child types`,
      )
      for (const route of parentRoutes) {
        const childTypes = route.types
        const typeFilter = childTypes.map((t: string) => `"${t}"`).join(', ')
        const children = await client.fetch(
          `*[_type in [${typeFilter}] && references($parentId)]{ _id, _type }`,
          {parentId: docId},
        )
        for (const child of children || []) {
          await syncSingleDocument(client, route, channel, child._id, child._type)
        }
        console.log(
          `[@sanity/routes] Re-synced ${(children || []).length} child document(s) for parent ${docId}`,
        )
      }
      return
    }

    // 3. Find the route entry for this document type (direct sync)
    const routeEntry = config.routes.find((r: any) => r.types.includes(docType))
    if (!routeEntry) {
      console.log(
        `[@sanity/routes] No route entry for type "${docType}" in channel "${channel}"`,
      )
      return
    }

    // 4. Handle delete → remove entry by _key
    if (event.type === 'delete') {
      const shard = await client.fetch(
        `*[_id == $shardId][0]{ "entryKey": entries[doc._ref == $docId][0]._key }`,
        {shardId: `routes-${channel}-${docType}`, docId},
      )
      if (shard?.entryKey) {
        await client
          .patch(`routes-${channel}-${docType}`)
          .unset([`entries[_key=="${shard.entryKey}"]`])
          .commit()
        console.log(`[@sanity/routes] Removed ${docId} from routes-${channel}-${docType}`)
      }
      return
    }

    // 5. Sync this document
    await syncSingleDocument(client, routeEntry, channel, docId, docType)
  })
}

/**
 * Sync a single document's route map entry.
 * @internal
 */
async function syncSingleDocument(
  client: any,
  routeEntry: any,
  channel: string,
  docId: string,
  docType: string,
) {
  const shardId = `routes-${channel}-${docType}`
  const pathExpression = routeEntry.pathExpression || 'slug.current'

  const result = await client.fetch(
    `*[_id == $docId][0]{ "path": ${pathExpression} }`,
    {docId},
  )

  if (!result?.path) {
    console.error(`[@sanity/routes] Could not resolve path for ${docId}`)
    return
  }

  const shard = await client.fetch(
    `*[_id == $shardId][0]{ "entryKey": entries[doc._ref == $docId][0]._key }`,
    {shardId, docId},
  )

  const tx = client
    .transaction()
    .createIfNotExists({
      _id: shardId,
      _type: 'routes.map',
      channel,
      documentType: docType,
      basePath: routeEntry.basePath,
      entries: [],
    })

  if (shard?.entryKey) {
    tx.patch(shardId, (p: any) => p.unset([`entries[_key=="${shard.entryKey}"]`]))
  }

  tx.patch(shardId, (p: any) =>
    p.insert('after', 'entries[-1]', [
      {
        doc: {_ref: docId, _type: 'reference', _weak: true},
        path: result.path,
      },
    ]),
  )

  await tx.commit({autoGenerateArrayKeys: true})
  console.log(`[@sanity/routes] Synced ${docId} → ${routeEntry.basePath}/${result.path}`)
}
