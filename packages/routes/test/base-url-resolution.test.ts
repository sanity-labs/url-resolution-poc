import {describe, it, expect} from 'vitest'
import {createRouteResolver} from '../src/resolver.js'
import {createMockClient} from './helpers/mock-client.js'
import type {RoutesConfig} from '../src/types.js'

const Q_CONFIG_BY_CHANNEL = `*[_type == "routes.config" && channel == $channel][0]`
const Q_DOC_TYPE = `*[_id == $id][0]{_type}`
const Q_PATH = (pathExpr: string) => `*[_id == $id][0]{"path": ${pathExpr}}.path`

function makeConfig(overrides: Partial<RoutesConfig> = {}): RoutesConfig {
  return {
    _id: 'routes-config-web',
    _type: 'routes.config',
    channel: 'web',
    isDefault: true,
    baseUrls: [
      {_key: 'prod', name: 'production', url: 'https://www.example.com', isDefault: true},
      {_key: 'staging', name: 'staging', url: 'https://staging.example.com'},
    ],
    routes: [
      {_key: 'r1', types: ['blogPost'], basePath: '/blog'},
    ],
    ...overrides,
  }
}

function standardMocks(config: RoutesConfig) {
  return [
    {query: Q_CONFIG_BY_CHANNEL, params: {channel: 'web'}, result: config},
    {query: Q_DOC_TYPE, params: {id: 'blog-hello'}, result: {_type: 'blogPost'}},
    {query: Q_PATH('slug.current'), params: {id: 'blog-hello'}, result: 'hello-world'},
  ]
}

describe('Base URL resolution precedence', () => {
  it('explicit baseUrl option wins over everything', async () => {
    const config = makeConfig()
    const client = createMockClient(standardMocks(config))
    const resolver = createRouteResolver(client, 'web', {baseUrl: 'https://override.example.com'})
    const url = await resolver.resolveUrlById('blog-hello')
    expect(url).toBe('https://override.example.com/blog/hello-world')
  })

  it('route-level baseUrls environment match', async () => {
    const config = makeConfig({
      routes: [
        {
          _key: 'r1',
          types: ['blogPost'],
          basePath: '/blog',
          baseUrls: [
            {_key: 'rprod', name: 'production', url: 'https://route-prod.example.com', isDefault: true},
            {_key: 'rstaging', name: 'staging', url: 'https://route-staging.example.com'},
          ],
        },
      ],
    })
    const client = createMockClient(standardMocks(config))
    const resolver = createRouteResolver(client, 'web', {environment: 'staging'})
    const url = await resolver.resolveUrlById('blog-hello')
    expect(url).toBe('https://route-staging.example.com/blog/hello-world')
  })

  it('route-level baseUrls isDefault when no env match', async () => {
    const config = makeConfig({
      routes: [
        {
          _key: 'r1',
          types: ['blogPost'],
          basePath: '/blog',
          baseUrls: [
            {_key: 'rprod', name: 'production', url: 'https://route-prod.example.com', isDefault: true},
            {_key: 'rstaging', name: 'staging', url: 'https://route-staging.example.com'},
          ],
        },
      ],
    })
    const client = createMockClient(standardMocks(config))
    const resolver = createRouteResolver(client, 'web')
    const url = await resolver.resolveUrlById('blog-hello')
    expect(url).toBe('https://route-prod.example.com/blog/hello-world')
  })

  it('falls through to channel-level env match', async () => {
    const config = makeConfig()
    const client = createMockClient(standardMocks(config))
    const resolver = createRouteResolver(client, 'web', {environment: 'staging'})
    const url = await resolver.resolveUrlById('blog-hello')
    expect(url).toBe('https://staging.example.com/blog/hello-world')
  })

  it('falls through to channel-level isDefault', async () => {
    const config = makeConfig()
    const client = createMockClient(standardMocks(config))
    const resolver = createRouteResolver(client, 'web')
    const url = await resolver.resolveUrlById('blog-hello')
    expect(url).toBe('https://www.example.com/blog/hello-world')
  })

  it('channel env match takes priority over channel isDefault', async () => {
    const config = makeConfig()
    const client = createMockClient(standardMocks(config))
    const resolver = createRouteResolver(client, 'web', {environment: 'staging'})
    const url = await resolver.resolveUrlById('blog-hello')
    expect(url).toBe('https://staging.example.com/blog/hello-world')
  })

  it('returns empty string when nothing matches', async () => {
    const config = makeConfig({baseUrls: []})
    const client = createMockClient(standardMocks(config))
    const resolver = createRouteResolver(client, 'web')
    const url = await resolver.resolveUrlById('blog-hello')
    expect(url).toBe('/blog/hello-world')
  })
})
