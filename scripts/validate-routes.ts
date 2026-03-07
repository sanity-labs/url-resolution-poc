#!/usr/bin/env tsx
/**
 * Bulk route validation script.
 *
 * Scans the entire route map for URL collisions. Exits with code 1 if
 * collisions are found — use in CI pipelines to catch issues early.
 *
 * Usage:
 *   npx tsx scripts/validate-routes.ts
 *
 * Requires environment variables:
 *   SANITY_PROJECT_ID, SANITY_DATASET, SANITY_READ_TOKEN (if shards are private)
 */
import {createClient} from '@sanity/client'
import {createRouteResolver} from '@sanity/routes'

const projectId = process.env.SANITY_PROJECT_ID
const dataset = process.env.SANITY_DATASET || 'production'
const token = process.env.SANITY_READ_TOKEN

if (!projectId) {
  console.error('SANITY_PROJECT_ID is required')
  process.exit(1)
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  useCdn: false,
  token,
})

const resolver = createRouteResolver(client, 'web')

async function validateAllRoutes() {
  const urlMap = await resolver.preload()

  // Invert: URL -> document IDs
  const urlToIds = new Map<string, string[]>()
  for (const [id, url] of urlMap) {
    const ids = urlToIds.get(url) || []
    ids.push(id)
    urlToIds.set(url, ids)
  }

  // Find collisions
  const collisions: Array<{url: string; ids: string[]}> = []
  for (const [url, ids] of urlToIds) {
    if (ids.length > 1) {
      collisions.push({url, ids})
    }
  }

  if (collisions.length === 0) {
    console.log('✅ No URL collisions found')
    console.log(`   Checked ${urlMap.size} routes`)
    return
  }

  console.log(`⚠️  Found ${collisions.length} URL collision(s):`)
  for (const {url, ids} of collisions) {
    console.log(`  ${url}`)
    for (const id of ids) {
      console.log(`    - ${id}`)
    }
  }

  process.exit(1)
}

validateAllRoutes().catch((err) => {
  console.error('Validation failed:', err.message)
  process.exit(1)
})
