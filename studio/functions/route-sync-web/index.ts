import {documentEventHandler} from '@sanity/functions'
import {createClient} from '@sanity/client'

export const handler = documentEventHandler(async ({context, event}: {context: any; event: any}) => {
  const client = createClient({
    ...context.clientOptions,
    apiVersion: '2024-01-01',
    useCdn: false,
  })

  const docId = event.data._id
  const docType = event.data._type
  const channel = 'web'

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
  //    If so, find all child route entries that depend on this parent and re-sync them
  const parentRoutes = config.routes.filter(
    (r: any) => r.mode === 'parentSlug' && r.parentType === docType,
  )

  if (parentRoutes.length > 0) {
    console.log(
      `[@sanity/routes] Parent type "${docType}" changed — re-syncing child types`,
    )
    for (const route of parentRoutes) {
      await syncChildDocuments(client, config, route, channel, docId)
    }
    return
  }

  // 3. Find route entry for this document type (direct sync)
  const routeEntry = config.routes.find((r: any) => r.types.includes(docType))
  if (!routeEntry) {
    console.log(`[@sanity/routes] No route entry for type "${docType}" in channel "${channel}"`)
    return
  }

  // 4. Sync this single document
  await syncDocument(client, routeEntry, channel, docId, docType, event.type)
})

/**
 * Sync a single document's route map entry.
 */
async function syncDocument(
  client: any,
  routeEntry: any,
  channel: string,
  docId: string,
  docType: string,
  eventType: string,
) {
  const shardId = `routes-${channel}-${docType}`

  // Handle delete → remove entry by _key
  if (eventType === 'delete') {
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

  // Resolve path via pathExpression
  const pathExpression = routeEntry.pathExpression || 'slug.current'
  const result = await client.fetch(
    `*[_id == $docId][0]{ "path": ${pathExpression} }`,
    {docId},
  )

  if (!result?.path) {
    console.error(`[@sanity/routes] Could not resolve path for ${docId}`)
    return
  }

  // Fetch existing entry key (if any) for clean replacement
  const shard = await client.fetch(
    `*[_id == $shardId][0]{ "entryKey": entries[doc._ref == $docId][0]._key }`,
    {shardId, docId},
  )

  // Upsert: createIfNotExists + remove old entry by _key + insert new
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

/**
 * When a parent document changes (e.g., docsNavSection slug),
 * re-sync all child documents that depend on it.
 */
async function syncChildDocuments(
  client: any,
  config: any,
  route: any,
  channel: string,
  parentDocId: string,
) {
  // Find all documents of the child types that reference this parent
  const childTypes = route.types
  const typeFilter = childTypes.map((t: string) => `"${t}"`).join(', ')

  const children = await client.fetch(
    `*[_type in [${typeFilter}] && references($parentId)]{ _id, _type }`,
    {parentId: parentDocId},
  )

  if (!children || children.length === 0) {
    console.log(`[@sanity/routes] No child documents reference parent ${parentDocId}`)
    return
  }

  console.log(
    `[@sanity/routes] Re-syncing ${children.length} child document(s) for parent ${parentDocId}`,
  )

  for (const child of children) {
    await syncDocument(client, route, channel, child._id, child._type, 'update')
  }
}
