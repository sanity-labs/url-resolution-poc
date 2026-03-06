import {describe, it, expect} from 'vitest'
import {createRouteResolver} from '../src/resolver.js'
import {createMockClient} from './helpers/mock-client.js'
import type {RoutesConfig} from '../src/types.js'

const Q_CONFIG_BY_CHANNEL = `*[_type == "routes.config" && channel == $channel][0]`
const Q_CONFIG_DEFAULT = `*[_type == "routes.config" && isDefault == true][0]`
const Q_CONFIG_ALL = `*[_type == "routes.config"]`
const Q_DOC_TYPE = `*[_id == $id][0]{_type}`
const Q_PATH = (pathExpr: string) => `*[_id == $id][0]{"path": ${pathExpr}}.path`

const WEB_CONFIG: RoutesConfig = {
  _id: 'routes-config-web',
  _type: 'routes.config',
  channel: 'web',
  isDefault: true,
  baseUrls: [{_key: 'prod', name: 'production', url: 'https://www.example.com', isDefault: true}],
  routes: [{_key: 'r1', types: ['blogPost'], basePath: '/blog'}],
}

const MOBILE_CONFIG: RoutesConfig = {
  _id: 'routes-config-mobile',
  _type: 'routes.config',
  channel: 'mobile',
  baseUrls: [{_key: 'prod', name: 'production', url: 'https://m.example.com', isDefault: true}],
  routes: [{_key: 'r1', types: ['blogPost'], basePath: '/blog'}],
}

describe('Config resolution', () => {
  it('resolves explicit channel', async () => {
    const client = createMockClient([
      {query: Q_CONFIG_BY_CHANNEL, params: {channel: 'web'}, result: WEB_CONFIG},
      {query: Q_DOC_TYPE, params: {id: 'blog-hello'}, result: {_type: 'blogPost'}},
      {query: Q_PATH('slug.current'), params: {id: 'blog-hello'}, result: 'hello-world'},
    ])
    const resolver = createRouteResolver(client, 'web')
    const url = await resolver.resolveUrlById('blog-hello')
    expect(url).toBe('https://www.example.com/blog/hello-world')
  })

  it('resolves default channel (isDefault: true)', async () => {
    const client = createMockClient([
      {query: Q_CONFIG_DEFAULT, result: WEB_CONFIG},
      {query: Q_DOC_TYPE, params: {id: 'blog-hello'}, result: {_type: 'blogPost'}},
      {query: Q_PATH('slug.current'), params: {id: 'blog-hello'}, result: 'hello-world'},
    ])
    const resolver = createRouteResolver(client)
    const url = await resolver.resolveUrlById('blog-hello')
    expect(url).toBe('https://www.example.com/blog/hello-world')
  })

  it('auto-resolves single config when no default', async () => {
    const singleConfig: RoutesConfig = {...WEB_CONFIG, isDefault: undefined}
    const client = createMockClient([
      {query: Q_CONFIG_DEFAULT, result: null},
      {query: Q_CONFIG_ALL, result: [singleConfig]},
      {query: Q_DOC_TYPE, params: {id: 'blog-hello'}, result: {_type: 'blogPost'}},
      {query: Q_PATH('slug.current'), params: {id: 'blog-hello'}, result: 'hello-world'},
    ])
    const resolver = createRouteResolver(client)
    const url = await resolver.resolveUrlById('blog-hello')
    expect(url).toBe('https://www.example.com/blog/hello-world')
  })

  it('throws when no config exists', async () => {
    const client = createMockClient([
      {query: Q_CONFIG_DEFAULT, result: null},
      {query: Q_CONFIG_ALL, result: []},
    ])
    const resolver = createRouteResolver(client)
    await expect(resolver.resolveUrlById('blog-hello')).rejects.toThrow(
      'No route config found',
    )
  })

  it('throws when multiple configs exist and none is default', async () => {
    const webNoDefault: RoutesConfig = {...WEB_CONFIG, isDefault: undefined}
    const mobileNoDefault: RoutesConfig = {...MOBILE_CONFIG, isDefault: undefined}
    const client = createMockClient([
      {query: Q_CONFIG_DEFAULT, result: null},
      {query: Q_CONFIG_ALL, result: [webNoDefault, mobileNoDefault]},
    ])
    const resolver = createRouteResolver(client)
    await expect(resolver.resolveUrlById('blog-hello')).rejects.toThrow(
      'Multiple route configs found',
    )
  })

  it('throws when explicit channel not found', async () => {
    const client = createMockClient([
      {query: Q_CONFIG_BY_CHANNEL, params: {channel: 'nonexistent'}, result: null},
    ])
    const resolver = createRouteResolver(client, 'nonexistent')
    await expect(resolver.resolveUrlById('blog-hello')).rejects.toThrow(
      'No route config found for channel "nonexistent"',
    )
  })
})
