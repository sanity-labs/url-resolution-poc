import { createClient } from '@sanity/client'
import { buildRouteMap } from '../packages/routes/dist/index.js'

const client = createClient({
  projectId: 'bb8k7pej',
  dataset: 'production',
  token: process.env.SANITY_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

console.log('Building route map for channel "web"...')
const result = await buildRouteMap(client, 'web')
console.log(`Done! ${result.shards} shards, ${result.entries} entries`)
if (result.errors.length > 0) {
  console.error('Errors:', result.errors)
}

// Verify shards were created
console.log('\n🔍 Verifying shards...')
const shards = await client.fetch('*[_type == "routes.map"]{ _id, channel, documentType, basePath, "entryCount": count(entries) }')
console.log('Shards:', JSON.stringify(shards, null, 2))
