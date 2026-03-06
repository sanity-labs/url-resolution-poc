import {describe, it, expect} from 'vitest'
import {createRouteResolver} from '../src/resolver.js'
import {createMockClient} from './helpers/mock-client.js'
import {WEB_CONFIG, BLOG_SHARD} from './helpers/fixtures.js'
import type {RoutesConfig, RouteMapShard} from '../src/types.js'

const Q_CONFIG_BY_CHANNEL = `*[_type == "routes.config" && channel == $channel][0]`
const Q_DOC_TYPE = `*[_id == $id][0]{_type}`
const Q_PATH = (pathExpr: string) => `*[_id == $id][0]{"path": ${pathExpr}}.path`
const Q_SHARD_FETCH = `*[_id == $shardId][0]`

describe('resolveUrlById', () => {
  describe('realtime mode', () => {
    it('happy path — resolves blog post URL', async () => {
      const client = createMockClient([
        {query: Q_CONFIG_BY_CHANNEL, params: {channel: 'web'}, result: WEB_CONFIG},
        {query: Q_DOC_TYPE, params: {id: 'blog-hello'}, result: {_type: 'blogPost'}},
        {query: Q_PATH('slug.current'), params: {id: 'blog-hello'}, result: 'hello-world'},
      ])
      const resolver = createRouteResolver(client, 'web')
      const url = await resolver.resolveUrlById('blog-hello')
      expect(url).toBe('https://www.example.com/blog/hello-world')
    })

    it('returns null when document not found', async () => {
      const client = createMockClient([
        {query: Q_CONFIG_BY_CHANNEL, params: {channel: 'web'}, result: WEB_CONFIG},
        {query: Q_DOC_TYPE, params: {id: 'nonexistent'}, result: null},
        // diagnose will also fetch doc type (handleResolutionFailure calls diagnose)
        {query: Q_DOC_TYPE, params: {id: 'nonexistent'}, result: null},
      ])
      const resolver = createRouteResolver(client, 'web', {warn: false})
      const url = await resolver.resolveUrlById('nonexistent')
      expect(url).toBeNull()
    })

    it('returns null when type has no route entry', async () => {
      const client = createMockClient([
        {query: Q_CONFIG_BY_CHANNEL, params: {channel: 'web'}, result: WEB_CONFIG},
        {query: Q_DOC_TYPE, params: {id: 'unknown-type-doc'}, result: {_type: 'unknownType'}},
        // diagnose will also fetch doc type
        {query: Q_DOC_TYPE, params: {id: 'unknown-type-doc'}, result: {_type: 'unknownType'}},
      ])
      const resolver = createRouteResolver(client, 'web', {warn: false})
      const url = await resolver.resolveUrlById('unknown-type-doc')
      expect(url).toBeNull()
    })

    it('returns null when slug is empty', async () => {
      const client = createMockClient([
        {query: Q_CONFIG_BY_CHANNEL, params: {channel: 'web'}, result: WEB_CONFIG},
        {query: Q_DOC_TYPE, params: {id: 'blog-no-slug'}, result: {_type: 'blogPost'}},
        {query: Q_PATH('slug.current'), params: {id: 'blog-no-slug'}, result: null},
        // diagnose will also fetch doc type and path
        {query: Q_DOC_TYPE, params: {id: 'blog-no-slug'}, result: {_type: 'blogPost'}},
        {query: Q_PATH('slug.current'), params: {id: 'blog-no-slug'}, result: null},
      ])
      const resolver = createRouteResolver(client, 'web', {warn: false})
      const url = await resolver.resolveUrlById('blog-no-slug')
      expect(url).toBeNull()
    })

    it('resolves with locale parameter', async () => {
      const pathExpr = 'slug[_key == $locale][0].value'
      const client = createMockClient([
        {query: Q_CONFIG_BY_CHANNEL, params: {channel: 'web'}, result: WEB_CONFIG},
        {query: Q_DOC_TYPE, params: {id: 'product-1'}, result: {_type: 'product'}},
        {query: Q_PATH(pathExpr), params: {id: 'product-1', locale: 'fr'}, result: 'mon-produit'},
      ])
      const resolver = createRouteResolver(client, 'web')
      const url = await resolver.resolveUrlById('product-1', {locale: 'fr'})
      expect(url).toBe('https://www.example.com/products/mon-produit')
    })

    it('resolves with custom pathExpression (article)', async () => {
      const pathExpr = '*[_type == "docsNavSection" && references(^._id)][0].slug.current + "/" + slug.current'
      const client = createMockClient([
        {query: Q_CONFIG_BY_CHANNEL, params: {channel: 'web'}, result: WEB_CONFIG},
        {query: Q_DOC_TYPE, params: {id: 'article-setup'}, result: {_type: 'article'}},
        {query: Q_PATH(pathExpr), params: {id: 'article-setup'}, result: 'getting-started/setup'},
      ])
      const resolver = createRouteResolver(client, 'web')
      const url = await resolver.resolveUrlById('article-setup')
      expect(url).toBe('https://www.example.com/docs/getting-started/setup')
    })
  })

  describe('static mode', () => {
    it('happy path — resolves from shard', async () => {
      const client = createMockClient([
        {query: Q_CONFIG_BY_CHANNEL, params: {channel: 'web'}, result: WEB_CONFIG},
        {query: Q_SHARD_FETCH, params: {shardId: 'routes-web-blogPost'}, result: BLOG_SHARD},
      ])
      const resolver = createRouteResolver(client, 'web', {mode: 'static'})
      const url = await resolver.resolveUrlById('blog-hello')
      expect(url).toBe('https://www.example.com/blog/hello-world')
    })

    it('returns null when doc not in any shard', async () => {
      const client = createMockClient([
        {query: Q_CONFIG_BY_CHANNEL, params: {channel: 'web'}, result: WEB_CONFIG},
        {query: Q_SHARD_FETCH, params: {shardId: 'routes-web-blogPost'}, result: BLOG_SHARD},
        {query: Q_SHARD_FETCH, params: {shardId: 'routes-web-article'}, result: null},
        {query: Q_SHARD_FETCH, params: {shardId: 'routes-web-product'}, result: null},
        // diagnose: doc type fetch + shard fetch
        {query: Q_DOC_TYPE, params: {id: 'not-in-shard'}, result: null},
      ])
      const resolver = createRouteResolver(client, 'web', {mode: 'static', warn: false})
      const url = await resolver.resolveUrlById('not-in-shard')
      expect(url).toBeNull()
    })
  })
})
