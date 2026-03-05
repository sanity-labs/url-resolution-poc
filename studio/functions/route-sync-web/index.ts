import {documentEventHandler} from '@sanity/functions'
import {createClient} from '@sanity/client'

/**
 * Route sync handler for the 'web' channel.
 *
 * In a published package setup, this would be:
 *   import { createRouteSyncHandler } from '@sanity/routes'
 *   export const handler = createRouteSyncHandler('web')
 *
 * Inlined here because the Functions bundler can't resolve
 * pnpm workspace links. See: https://www.sanity.io/docs/compute-and-ai/function-dependencies
 */
const channel = 'web'

export const handler = documentEventHandler(async ({context, event}: {context: any; event: any}) => {
  const client = createClient({
    ...context.clientOptions,
    apiVersion: '2024-01-01',
    useCdn: false,
  })

  const docId = event.data._id
  const docType = event.data._type

  // Fetch route config
  const config = await client.fetch(
    `*[_type == "routes.config" && channel == $channel][0]`,
    {channel},
  )
  if (!config) {
    console.error(`[@sanity/routes] No route config found for channel "${channel}"`)
    return
  }

  // Check if this is a parent type change → re-sync child documents
  const parentRoutes = config.routes.filter(
    (r: any) => r.mode === 'parentSlug' && r.parentType === docType,
  )

  if (parentRoutes.length > 0) {
    console.log(`[@sanity/routes] Parent type "${docType}" changed — re-syncing children`)
    for (const route of parentRoutes) {
      const typeFilter = route.types.map((t: string) => `"${t}"`).join(', ')
      const children = await client.fetch(
        `*[_type in [${typeFilter}] && references($parentId)]{ _id, _type }`,
        {parentId: docId},
      )
      for (const child of children || []) {
        await syncDocument(client, route, child._id, child._type)
      }
      console.log(`[@sanity/routes] Re-synced ${(children || []).length} child document(s)`)
    }
    return
  }

  // Find route entry for this document type
  const routeEntry = config.routes.find((r: any) => r.types.includes(docType))
  if (!routeEntry) return

  // Handle delete
  if (event.type === 'delete') {
    const shardId = `routes-${channel}-${docType}`
    const shard = await client.fetch(
      `*[_id == $shardId][0]{ "entryKey": entries[doc._ref == $docId][0]._key }`,
      {shardId, docId},
    )
    if (shard?.entryKey) {
      await client.patch(shardId).unset([`entries[_key=="${shard.entryKey}"]`]).commit()
      console.log(`[@sanity/routes] Removed ${docId} from ${shardId}`)
    }
    return
  }

  await syncDocument(client, routeEntry, docId, docType)
})

async function syncDocument(client: any, routeEntry: any, docId: string, docType: string) {
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

  const tx = client.transaction().createIfNotExists({
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
    p.insert('after', 'entries[-1]', [{
      doc: {_ref: docId, _type: 'reference', _weak: true},
      path: result.path,
    }]),
  )

  await tx.commit({autoGenerateArrayKeys: true})
  console.log(`[@sanity/routes] Synced ${docId} → ${routeEntry.basePath}/${result.path}`)
}
