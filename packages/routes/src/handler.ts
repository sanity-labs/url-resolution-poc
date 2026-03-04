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

    // 2. Find the route entry for this document type
    const routeEntry = config.routes.find((r: any) => r.types.includes(docType))
    if (!routeEntry) {
      console.log(
        `[@sanity/routes] No route entry for type "${docType}" in channel "${channel}"`,
      )
      return
    }

    // 3. Determine shard ID
    const shardId = `routes-${channel}-${docType}`

    // 4. Handle delete → remove entry by _key
    if (event.type === 'delete') {
      const shard = await client.fetch(
        `*[_id == $shardId][0]{ "entryKey": entries[doc._ref == $docId][0]._key }`,
        {shardId, docId},
      )
      if (shard?.entryKey) {
        await client
          .patch(shardId)
          .unset([`entries[_key=="${shard.entryKey}"]`])
          .commit()
        console.log(`[@sanity/routes] Removed ${docId} from ${shardId}`)
      }
      return
    }

    // 5. Handle create/update → resolve path via pathExpression
    const pathExpression = routeEntry.pathExpression || 'slug.current'
    const result = await client.fetch(
      `*[_id == $docId][0]{ "path": ${pathExpression} }`,
      {docId},
    )

    if (!result?.path) {
      console.error(`[@sanity/routes] Could not resolve path for ${docId}`)
      return
    }

    // 6. Fetch existing entry key (if any) for clean replacement
    const shard = await client.fetch(
      `*[_id == $shardId][0]{ "entryKey": entries[doc._ref == $docId][0]._key }`,
      {shardId, docId},
    )

    // 7. Upsert: createIfNotExists + remove old entry by _key + insert new
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

    // If existing entry found, remove it by _key
    if (shard?.entryKey) {
      tx.patch(shardId, (p: any) => p.unset([`entries[_key=="${shard.entryKey}"]`]))
    }

    // Insert new entry
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
  })
}
