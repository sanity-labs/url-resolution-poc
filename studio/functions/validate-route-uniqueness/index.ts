import {documentEventHandler} from '@sanity/functions'
import {createClient} from '@sanity/client'

export const handler = documentEventHandler(async ({context, event}) => {
  const client = createClient({
    ...context.clientOptions,
    apiVersion: '2024-01-01',
    useCdn: false,
  })

  const docId = event.data._id
  const docType = event.data._type

  // Only check on publish, not delete
  if (event.type === 'delete') return

  // Fetch route config
  const config = await client.fetch(
    `*[_type == "routes.config" && channel == $channel][0]`,
    {channel: 'web'},
  )
  if (!config) return

  // Find route entry for this type
  const route = config.routes?.find((r: any) => r.types?.includes(docType))
  if (!route) return

  const pathExpr = route.pathExpression || 'slug.current'
  const basePath = route.basePath || ''

  // Evaluate this document's path
  const pathRaw = await client.fetch(
    `*[_id == $id][0]{"path": ${pathExpr}}.path`,
    {id: docId},
  )
  if (!pathRaw) return

  const fullPath = normalizePath(basePath + '/' + pathRaw)

  // Check all shards for a different document with the same resolved path
  const routableTypes = config.routes.flatMap((r: any) => r.types || [])
  const shardIds = routableTypes.map(
    (t: string) => `routes-${config.channel || 'web'}-${t}`,
  )

  const shards = await client.fetch(`*[_id in $shardIds]`, {shardIds})

  for (const shard of shards) {
    const shardBasePath = shard.basePath || ''
    for (const entry of shard.entries || []) {
      if (entry.doc?._ref === docId) continue // Skip self
      const entryFullPath = normalizePath(shardBasePath + '/' + entry.path)
      if (entryFullPath === fullPath) {
        // Collision found
        console.warn(
          `URL collision: "${docId}" (${docType}) and ` +
            `"${entry.doc._ref}" both resolve to ${fullPath}`,
        )

        // Write a collision record for Studio visibility
        const collisionId = `collision-${slugify(fullPath)}`
        await client.createIfNotExists({
          _id: collisionId,
          _type: 'routes.collision',
          path: fullPath,
          documents: [
            {_type: 'reference', _ref: docId, _weak: true, _key: docId},
            {_type: 'reference', _ref: entry.doc._ref, _weak: true, _key: entry.doc._ref},
          ],
          detectedAt: new Date().toISOString(),
        })
        return
      }
    }
  }

  // No collision — clean up any stale collision record for this path
  const staleCollision = await client.fetch(
    `*[_type == "routes.collision" && path == $path][0]._id`,
    {path: fullPath},
  )
  if (staleCollision) {
    await client.delete(staleCollision)
  }
})

function normalizePath(path: string): string {
  return ('/' + path).replace(/\/+/g, '/').replace(/\/$/, '') || '/'
}

function slugify(path: string): string {
  return path
    .replace(/^\//, '')
    .replace(/\//g, '-')
    .replace(/[^a-z0-9-]/gi, '')
}
