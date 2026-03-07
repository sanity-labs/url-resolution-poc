import {describe, it, expect, vi} from 'vitest'
import {buildRouteMap} from '../src/build.js'
import type {RoutesConfig} from '../src/types.js'

const WEB_CONFIG: RoutesConfig = {
  _id: 'routes-config-web',
  _type: 'routes.config',
  channel: 'web',
  baseUrls: [{_key: 'prod', name: 'production', url: 'https://www.example.com', isDefault: true}],
  routes: [
    {_key: 'r1', types: ['blogPost'], basePath: '/blog'},
    {
      _key: 'r2',
      types: ['product'],
      basePath: '/products',
      pathExpression: 'slug[_key == $locale][0].value',
      locales: ['en', 'fr'],
    },
  ],
}

function createMockBuildClient(config: RoutesConfig | null, docsByQuery: Record<string, unknown[]>) {
  return {
    fetch: vi.fn(async (query: string, params?: Record<string, unknown>) => {
      if (query.includes('routes.config')) return config
      // Match doc queries by type
      const typeParam = params?.docType as string
      if (typeParam && docsByQuery[typeParam]) {
        return docsByQuery[typeParam]
      }
      return []
    }),
    createOrReplace: vi.fn(),
  } as any
}

describe('buildRouteMap', () => {
  it('builds one shard per type for non-locale routes', async () => {
    const client = createMockBuildClient(WEB_CONFIG, {
      blogPost: [
        {_id: 'blog-1', path: 'hello-world'},
        {_id: 'blog-2', path: 'intro'},
      ],
      product: [],
    })

    const result = await buildRouteMap(client, 'web')

    // blogPost: 1 shard, product: 0 docs but 2 locale shards (en, fr)
    expect(result.errors).toEqual([])
    expect(result.shards).toBe(3) // 1 blogPost + 2 product locales

    // Check blogPost shard
    const blogCall = client.createOrReplace.mock.calls.find(
      (c: any[]) => c[0]._id === 'routes-web-blogPost',
    )
    expect(blogCall).toBeDefined()
    expect(blogCall[0].entries).toHaveLength(2)
  })

  it('builds locale-specific shards for i18n routes', async () => {
    const client = createMockBuildClient(WEB_CONFIG, {
      blogPost: [],
      product: [
        {_id: 'prod-1', path: 'sneakers'},
      ],
    })

    const result = await buildRouteMap(client, 'web')

    // Check locale-specific shard IDs
    const shardIds = client.createOrReplace.mock.calls.map((c: any[]) => c[0]._id)
    expect(shardIds).toContain('routes-web-product-en')
    expect(shardIds).toContain('routes-web-product-fr')
    expect(shardIds).not.toContain('routes-web-product') // no base shard for locale routes
  })

  it('passes locale param to pathExpression query', async () => {
    const client = createMockBuildClient(WEB_CONFIG, {
      blogPost: [],
      product: [{_id: 'prod-1', path: 'sneakers'}],
    })

    await buildRouteMap(client, 'web')

    // Check that fetch was called with locale params for product queries
    const productFetches = client.fetch.mock.calls.filter(
      (c: any[]) => c[1]?.docType === 'product',
    )
    const locales = productFetches.map((c: any[]) => c[1]?.locale)
    expect(locales).toContain('en')
    expect(locales).toContain('fr')
  })

  it('returns error when no config found', async () => {
    const client = createMockBuildClient(null, {})
    const result = await buildRouteMap(client, 'web')
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('No route config found')
  })
})
