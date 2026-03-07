import {documentEventHandler} from '@sanity/functions'
import {createClient} from '@sanity/client'

export const handler = documentEventHandler(async ({context, event}) => {
  const client = createClient({
    ...context.clientOptions,
    apiVersion: '2024-01-01',
    useCdn: false,
  })

  const {before, after} = event.data
    ? {before: event.type === 'update' ? null : null, after: event.data}
    : {before: null, after: null}

  // We need both before and after states to detect path changes
  // For the Function, we compare the current published path with what's in the route map
  const docId = event.data._id
  const docType = event.data._type

  // Only handle publish events (creates and updates)
  if (event.type === 'delete') return

  // Fetch route config
  const config = await client.fetch(
    `*[_type == "routes.config" && channel == $channel][0]`,
    {channel: 'web'},
  )
  if (!config) return

  // Find the route entry for this document type
  const route = config.routes?.find((r: any) => r.types?.includes(docType))
  if (!route) return

  const pathExpr = route.pathExpression || 'slug.current'
  const basePath = route.basePath || ''

  // Get the new path from the document
  const newPathRaw = await client.fetch(
    `*[_id == $id][0]{"path": ${pathExpr}}.path`,
    {id: docId},
  )
  if (!newPathRaw) return

  const fullNewPath = normalizePath(basePath + '/' + newPathRaw)

  // Get the old path from the route map shard
  const shardId = `routes-${config.channel || 'web'}-${docType}`
  const oldEntry = await client.fetch(
    `*[_id == $shardId][0].entries[doc._ref == $docId][0].path`,
    {shardId, docId},
  )

  // No old entry (new document) or path hasn't changed
  if (!oldEntry || oldEntry === fullNewPath) return

  const fullOldPath = oldEntry.startsWith('/') ? oldEntry : normalizePath(basePath + '/' + oldEntry)

  // \u2500\u2500 Chain flattening \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  // Find all existing redirects that point TO the old path.
  // Update them to point to the new path instead.
  // This turns A\u2192B, B\u2192C into A\u2192C, B\u2192C (no chains).
  const chainsToFlatten = await client.fetch<Array<{_id: string}>>(
    `*[_type == "routes.redirect" && to == $oldPath]{ _id }`,
    {oldPath: fullOldPath},
  )

  const tx = client.transaction()

  for (const redirect of chainsToFlatten) {
    tx.patch(redirect._id, (p: any) => p.set({to: fullNewPath}))
  }

  // \u2500\u2500 Create or update the redirect \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  // Deterministic ID from the source path \u2014 prevents duplicates
  const redirectId = `redirect-${slugify(fullOldPath)}`

  tx.createIfNotExists({
    _id: redirectId,
    _type: 'routes.redirect',
    from: fullOldPath,
    to: fullNewPath,
    statusCode: '301',
    source: 'auto',
    document: {_type: 'reference', _ref: docId, _weak: true},
  })
  // If redirect already exists (re-publish), update the target
  tx.patch(redirectId, (p: any) => p.set({to: fullNewPath}))

  // \u2500\u2500 Loop prevention \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  // If a redirect FROM the new path exists, delete it to prevent loops
  const loopRedirect = await client.fetch<{_id: string} | null>(
    `*[_type == "routes.redirect" && from == $newPath][0]{ _id }`,
    {newPath: fullNewPath},
  )
  if (loopRedirect) {
    tx.delete(loopRedirect._id)
  }

  await tx.commit()

  const flattened = chainsToFlatten.length
  console.log(
    `Redirect: ${fullOldPath} \u2192 ${fullNewPath}` +
      (flattened > 0
        ? ` (flattened ${flattened} chain${flattened > 1 ? 's' : ''})`
        : ''),
  )
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
