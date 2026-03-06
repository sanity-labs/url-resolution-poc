import {describe, it, expect} from 'vitest'
import {createRouteResolver} from '../src/resolver.js'
import {createMockClient} from './helpers/mock-client.js'
import type {RoutesConfig} from '../src/types.js'

// Query constants — must match resolver.ts exactly
const Q_CONFIG_BY_CHANNEL = `*[_type == "routes.config" && channel == $channel][0]`
const Q_DOC_TYPE = `*[_id == $id][0]{_type}`
const Q_PATH = (pathExpr: string) => `*[_id == $id][0]{"path": ${pathExpr}}.path`

const SIMPLE_CONFIG: RoutesConfig = {
  _id: 'routes-config-web',
  _type: 'routes.config',
  channel: 'web',
  isDefault: true,
  baseUrls: [
    {_key: 'prod', name: 'production', url: 'https://www.example.com', isDefault: true},
  ],
  routes: [
    {_key: 'r1', types: ['blogPost'], basePath: '/blog'},
    {_key: 'r2', types: ['page'], basePath: ''},
  ],
}

describe('URL assembly', () => {
  it('assembles base + basePath + path', async () => {
    const client = createMockClient([
      {query: Q_CONFIG_BY_CHANNEL, params: {channel: 'web'}, result: SIMPLE_CONFIG},
      {query: Q_DOC_TYPE, params: {id: 'blog-hello'}, result: {_type: 'blogPost'}},
      {query: Q_PATH('slug.current'), params: {id: 'blog-hello'}, result: 'hello-world'},
    ])
    const resolver = createRouteResolver(client, 'web')
    const url = await resolver.resolveUrlById('blog-hello')
    expect(url).toBe('https://www.example.com/blog/hello-world')
  })

  it('handles empty basePath (root-level routes)', async () => {
    const client = createMockClient([
      {query: Q_CONFIG_BY_CHANNEL, params: {channel: 'web'}, result: SIMPLE_CONFIG},
      {query: Q_DOC_TYPE, params: {id: 'page-about'}, result: {_type: 'page'}},
      {query: Q_PATH('slug.current'), params: {id: 'page-about'}, result: 'about'},
    ])
    const resolver = createRouteResolver(client, 'web')
    const url = await resolver.resolveUrlById('page-about')
    expect(url).toBe('https://www.example.com/about')
  })

  it('normalizes leading slash on path', async () => {
    const client = createMockClient([
      {query: Q_CONFIG_BY_CHANNEL, params: {channel: 'web'}, result: SIMPLE_CONFIG},
      {query: Q_DOC_TYPE, params: {id: 'blog-hello'}, result: {_type: 'blogPost'}},
      {query: Q_PATH('slug.current'), params: {id: 'blog-hello'}, result: '/hello-world'},
    ])
    const resolver = createRouteResolver(client, 'web')
    const url = await resolver.resolveUrlById('blog-hello')
    expect(url).toBe('https://www.example.com/blog/hello-world')
  })

  it('strips trailing slash from base URL', async () => {
    const configWithTrailingSlash: RoutesConfig = {
      ...SIMPLE_CONFIG,
      baseUrls: [{_key: 'prod', name: 'production', url: 'https://www.example.com/', isDefault: true}],
    }
    const client = createMockClient([
      {query: Q_CONFIG_BY_CHANNEL, params: {channel: 'web'}, result: configWithTrailingSlash},
      {query: Q_DOC_TYPE, params: {id: 'blog-hello'}, result: {_type: 'blogPost'}},
      {query: Q_PATH('slug.current'), params: {id: 'blog-hello'}, result: 'hello-world'},
    ])
    const resolver = createRouteResolver(client, 'web')
    const url = await resolver.resolveUrlById('blog-hello')
    expect(url).toBe('https://www.example.com/blog/hello-world')
  })

  it('handles no base URL (empty string)', async () => {
    const configNoBaseUrl: RoutesConfig = {
      ...SIMPLE_CONFIG,
      baseUrls: [],
    }
    const client = createMockClient([
      {query: Q_CONFIG_BY_CHANNEL, params: {channel: 'web'}, result: configNoBaseUrl},
      {query: Q_DOC_TYPE, params: {id: 'blog-hello'}, result: {_type: 'blogPost'}},
      {query: Q_PATH('slug.current'), params: {id: 'blog-hello'}, result: 'hello-world'},
    ])
    const resolver = createRouteResolver(client, 'web')
    const url = await resolver.resolveUrlById('blog-hello')
    expect(url).toBe('/blog/hello-world')
  })

  it('handles nested path segments', async () => {
    const client = createMockClient([
      {query: Q_CONFIG_BY_CHANNEL, params: {channel: 'web'}, result: SIMPLE_CONFIG},
      {query: Q_DOC_TYPE, params: {id: 'blog-nested'}, result: {_type: 'blogPost'}},
      {query: Q_PATH('slug.current'), params: {id: 'blog-nested'}, result: 'category/my-post'},
    ])
    const resolver = createRouteResolver(client, 'web')
    const url = await resolver.resolveUrlById('blog-nested')
    expect(url).toBe('https://www.example.com/blog/category/my-post')
  })

  it('normalizes basePath without leading slash', async () => {
    const configSloppyBasePath: RoutesConfig = {
      ...SIMPLE_CONFIG,
      routes: [{_key: 'r1', types: ['blogPost'], basePath: 'blog'}],
    }
    const client = createMockClient([
      {query: Q_CONFIG_BY_CHANNEL, params: {channel: 'web'}, result: configSloppyBasePath},
      {query: Q_DOC_TYPE, params: {id: 'blog-hello'}, result: {_type: 'blogPost'}},
      {query: Q_PATH('slug.current'), params: {id: 'blog-hello'}, result: 'hello-world'},
    ])
    const resolver = createRouteResolver(client, 'web')
    const url = await resolver.resolveUrlById('blog-hello')
    expect(url).toBe('https://www.example.com/blog/hello-world')
  })

  it('normalizes basePath with trailing slash', async () => {
    const configTrailingBasePath: RoutesConfig = {
      ...SIMPLE_CONFIG,
      routes: [{_key: 'r1', types: ['blogPost'], basePath: '/blog/'}],
    }
    const client = createMockClient([
      {query: Q_CONFIG_BY_CHANNEL, params: {channel: 'web'}, result: configTrailingBasePath},
      {query: Q_DOC_TYPE, params: {id: 'blog-hello'}, result: {_type: 'blogPost'}},
      {query: Q_PATH('slug.current'), params: {id: 'blog-hello'}, result: 'hello-world'},
    ])
    const resolver = createRouteResolver(client, 'web')
    const url = await resolver.resolveUrlById('blog-hello')
    expect(url).toBe('https://www.example.com/blog/hello-world')
  })
})
