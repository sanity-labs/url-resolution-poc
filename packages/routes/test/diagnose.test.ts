import {describe, it, expect, vi} from 'vitest'
import {createRouteResolver} from '../src/resolver.js'
import {createMockClient} from './helpers/mock-client.js'
import {WEB_CONFIG, BLOG_SHARD} from './helpers/fixtures.js'
import type {RoutesConfig, DiagnosisResult} from '../src/types.js'

const Q_CONFIG_BY_CHANNEL = `*[_type == "routes.config" && channel == $channel][0]`
const Q_CONFIG_DEFAULT = `*[_type == "routes.config" && isDefault == true][0]`
const Q_CONFIG_ALL = `*[_type == "routes.config"]`
const Q_DOC_TYPE = `*[_id == $id][0]{_type}`
const Q_PATH = (pathExpr: string) => `*[_id == $id][0]{"path": ${pathExpr}}.path`
const Q_SHARD_FETCH = `*[_id == $shardId][0]`

describe('diagnose', () => {
  describe('realtime mode', () => {
    it('resolved — doc resolves normally', async () => {
      const client = createMockClient([
        {query: Q_CONFIG_BY_CHANNEL, params: {channel: 'web'}, result: WEB_CONFIG},
        {query: Q_DOC_TYPE, params: {id: 'blog-hello'}, result: {_type: 'blogPost'}},
        {query: Q_PATH('slug.current'), params: {id: 'blog-hello'}, result: 'hello-world'},
      ])
      const resolver = createRouteResolver(client, 'web')
      const result = await resolver.diagnose('blog-hello')
      expect(result.status).toBe('resolved')
      expect(result.url).toBe('https://www.example.com/blog/hello-world')
      expect(result.documentId).toBe('blog-hello')
      expect(result.documentType).toBe('blogPost')
    })

    it('document_not_found — ID does not exist', async () => {
      const client = createMockClient([
        {query: Q_CONFIG_BY_CHANNEL, params: {channel: 'web'}, result: WEB_CONFIG},
        {query: Q_DOC_TYPE, params: {id: 'nonexistent'}, result: null},
      ])
      const resolver = createRouteResolver(client, 'web')
      const result = await resolver.diagnose('nonexistent')
      expect(result.status).toBe('document_not_found')
      expect(result.documentId).toBe('nonexistent')
    })

    it('no_route_entry — type not routable', async () => {
      const client = createMockClient([
        {query: Q_CONFIG_BY_CHANNEL, params: {channel: 'web'}, result: WEB_CONFIG},
        {query: Q_DOC_TYPE, params: {id: 'unknown-doc'}, result: {_type: 'unknownType'}},
      ])
      const resolver = createRouteResolver(client, 'web')
      const result = await resolver.diagnose('unknown-doc')
      expect(result.status).toBe('no_route_entry')
      expect(result.documentType).toBe('unknownType')
      expect(result.availableRoutes).toContain('blogPost')
    })

    it('empty_path — slug is null', async () => {
      const client = createMockClient([
        {query: Q_CONFIG_BY_CHANNEL, params: {channel: 'web'}, result: WEB_CONFIG},
        {query: Q_DOC_TYPE, params: {id: 'blog-no-slug'}, result: {_type: 'blogPost'}},
        {query: Q_PATH('slug.current'), params: {id: 'blog-no-slug'}, result: null},
      ])
      const resolver = createRouteResolver(client, 'web')
      const result = await resolver.diagnose('blog-no-slug')
      expect(result.status).toBe('empty_path')
      expect(result.documentType).toBe('blogPost')
    })

    it('no_config — no route config', async () => {
      const client = createMockClient([
        {query: Q_CONFIG_DEFAULT, result: null},
        {query: Q_CONFIG_ALL, result: []},
      ])
      const resolver = createRouteResolver(client)
      const result = await resolver.diagnose('blog-hello')
      expect(result.status).toBe('no_config')
      expect(result.documentId).toBe('blog-hello')
    })
  })

  describe('static mode', () => {
    it('resolved — doc found in shard', async () => {
      const client = createMockClient([
        {query: Q_CONFIG_BY_CHANNEL, params: {channel: 'web'}, result: WEB_CONFIG},
        {query: Q_DOC_TYPE, params: {id: 'blog-hello'}, result: {_type: 'blogPost'}},
        {query: Q_SHARD_FETCH, params: {shardId: 'routes-web-blogPost'}, result: BLOG_SHARD},
      ])
      const resolver = createRouteResolver(client, 'web', {mode: 'static'})
      const result = await resolver.diagnose('blog-hello')
      expect(result.status).toBe('resolved')
      expect(result.url).toBe('https://www.example.com/blog/hello-world')
    })

    it('shard_not_found — route exists but no shard', async () => {
      const client = createMockClient([
        {query: Q_CONFIG_BY_CHANNEL, params: {channel: 'web'}, result: WEB_CONFIG},
        {query: Q_DOC_TYPE, params: {id: 'blog-hello'}, result: {_type: 'blogPost'}},
        {query: Q_SHARD_FETCH, params: {shardId: 'routes-web-blogPost'}, result: null},
      ])
      const resolver = createRouteResolver(client, 'web', {mode: 'static'})
      const result = await resolver.diagnose('blog-hello')
      expect(result.status).toBe('shard_not_found')
      expect(result.documentType).toBe('blogPost')
    })

    it('empty_path — doc in shard but no entry', async () => {
      const client = createMockClient([
        {query: Q_CONFIG_BY_CHANNEL, params: {channel: 'web'}, result: WEB_CONFIG},
        {query: Q_DOC_TYPE, params: {id: 'blog-missing-entry'}, result: {_type: 'blogPost'}},
        {query: Q_SHARD_FETCH, params: {shardId: 'routes-web-blogPost'}, result: BLOG_SHARD},
      ])
      const resolver = createRouteResolver(client, 'web', {mode: 'static'})
      const result = await resolver.diagnose('blog-missing-entry')
      expect(result.status).toBe('empty_path')
    })
  })

  describe('warn and onResolutionError options', () => {
    it('warn: true logs to console.warn on failure', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const client = createMockClient([
        {query: Q_CONFIG_BY_CHANNEL, params: {channel: 'web'}, result: WEB_CONFIG},
        {query: Q_DOC_TYPE, params: {id: 'nonexistent'}, result: null},
        // diagnose also fetches doc type
        {query: Q_DOC_TYPE, params: {id: 'nonexistent'}, result: null},
      ])
      const resolver = createRouteResolver(client, 'web', {warn: true})
      await resolver.resolveUrlById('nonexistent')
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[@sanity/routes]'),
      )
      warnSpy.mockRestore()
    })

    it('onResolutionError callback is called with diagnosis', async () => {
      const errorCallback = vi.fn()
      const client = createMockClient([
        {query: Q_CONFIG_BY_CHANNEL, params: {channel: 'web'}, result: WEB_CONFIG},
        {query: Q_DOC_TYPE, params: {id: 'nonexistent'}, result: null},
        // diagnose also fetches doc type
        {query: Q_DOC_TYPE, params: {id: 'nonexistent'}, result: null},
      ])
      const resolver = createRouteResolver(client, 'web', {onResolutionError: errorCallback})
      await resolver.resolveUrlById('nonexistent')
      expect(errorCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'document_not_found',
          documentId: 'nonexistent',
        }),
      )
    })
  })
})
