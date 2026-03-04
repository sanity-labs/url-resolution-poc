import { documentEventHandler } from '@sanity/functions'
import { createClient } from '@sanity/client'

export const handler = documentEventHandler(async ({ context, event }) => {
  const client = createClient({
    ...context.clientOptions,
    apiVersion: '2024-01-01',
    useCdn: false,
  })

  const docId = event.data._id
  const docType = event.data._type

  // 1. Fetch route config from Content Lake
  const config = await client.fetch(`*[_type == "routes.config" && channel == "web"][0]`)
  if (!config) {
    console.error('No route config found')
    return
  }

  // 2. Find the route entry for this document type
  const routeEntry = config.routes.find((r: any) => r.types.includes(docType))
  if (!routeEntry) {
    console.log(`No route entry for type ${docType}`)
    return
  }

  // 3. Determine shard ID
  const shardId = `routes.web.${docType}`

  // 4. Handle delete → remove entry
  if (event.type === 'delete') {
    await client
      .patch(shardId)
      .unset([`entries[doc._ref=="${docId}"]`])
      .commit()
    console.log(`Removed ${docId} from ${shardId}`)
    return
  }

  // 5. Handle create/update → resolve path via pathExpression
  const pathExpression = routeEntry.pathExpression || 'slug.current'
  const result = await client.fetch(
    `*[_id == $docId][0]{ "path": ${pathExpression} }`,
    { docId }
  )

  if (!result?.path) {
    console.error(`Could not resolve path for ${docId}`)
    return
  }

  // 6. Upsert: single-transaction createIfNotExists + unset + insert
  await client.transaction()
    .createIfNotExists({
      _id: shardId,
      _type: 'routes.map',
      channel: 'web',
      documentType: docType,
      basePath: routeEntry.basePath,
      entries: [],
    })
    .patch(shardId, (p: any) => p
      .unset([`entries[doc._ref=="${docId}"]`])
      .insert('after', 'entries[-1]', [{
        doc: { _ref: docId, _type: 'reference', _weak: true },
        path: result.path,
      }])
    )
    .commit({ autoGenerateArrayKeys: true })

  console.log(`Synced ${docId} → ${routeEntry.basePath}/${result.path}`)
})
