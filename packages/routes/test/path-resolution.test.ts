import {describe, it, expect} from 'vitest'
import {createRouteResolver} from '../src/resolver.js'
import {getPath} from '../src/get-path.js'
import {createMockClient} from './helpers/mock-client.js'
import {WEB_CONFIG} from './helpers/fixtures.js'

const Q_CONFIG_BY_CHANNEL = `*[_type == "routes.config" && channel == $channel][0]`
const Q_DOC_TYPE = `*[_id == $id][0]{_type}`
const Q_PATH = (pathExpr: string) => `*[_id == $id][0]{"path": ${pathExpr}}.path`

describe('resolvePathById', () => {
  it('happy path — returns pathname only', async () => {
    const client = createMockClient([
      {query: Q_CONFIG_BY_CHANNEL, params: {channel: 'web'}, result: WEB_CONFIG},
      {query: Q_DOC_TYPE, params: {id: 'blog-hello'}, result: {_type: 'blogPost'}},
      {query: Q_PATH('slug.current'), params: {id: 'blog-hello'}, result: 'hello-world'},
    ])
    const resolver = createRouteResolver(client, 'web')
    const path = await resolver.resolvePathById('blog-hello')
    expect(path).toBe('/blog/hello-world')
  })

  it('returns null for missing doc', async () => {
    const client = createMockClient([
      {query: Q_CONFIG_BY_CHANNEL, params: {channel: 'web'}, result: WEB_CONFIG},
      {query: Q_DOC_TYPE, params: {id: 'nonexistent'}, result: null},
      // diagnose will also fetch doc type (handleResolutionFailure calls diagnose)
      {query: Q_DOC_TYPE, params: {id: 'nonexistent'}, result: null},
    ])
    const resolver = createRouteResolver(client, 'web')
    const path = await resolver.resolvePathById('nonexistent')
    expect(path).toBeNull()
  })

  it('resolves hierarchical path (article with parent)', async () => {
    const pathExpr = '*[_type == "docsNavSection" && references(^._id)][0].slug.current + "/" + slug.current'
    const client = createMockClient([
      {query: Q_CONFIG_BY_CHANNEL, params: {channel: 'web'}, result: WEB_CONFIG},
      {query: Q_DOC_TYPE, params: {id: 'article-setup'}, result: {_type: 'article'}},
      {query: Q_PATH(pathExpr), params: {id: 'article-setup'}, result: 'getting-started/setup'},
    ])
    const resolver = createRouteResolver(client, 'web')
    const path = await resolver.resolvePathById('article-setup')
    expect(path).toBe('/docs/getting-started/setup')
  })
})

describe('resolvePathByIds', () => {
  it('batch resolution — returns Record of pathnames', async () => {
    const client = createMockClient([
      {query: Q_CONFIG_BY_CHANNEL, params: {channel: 'web'}, result: WEB_CONFIG},
      {
        query: `*[_id in $ids]{_id, _type}`,
        params: {ids: ['blog-hello', 'blog-intro']},
        result: [
          {_id: 'blog-hello', _type: 'blogPost'},
          {_id: 'blog-intro', _type: 'blogPost'},
        ],
      },
      {
        query: `*[_id in $groupIds]{"_id": _id, "path": slug.current}`,
        params: {groupIds: ['blog-hello', 'blog-intro']},
        result: [
          {_id: 'blog-hello', path: 'hello-world'},
          {_id: 'blog-intro', path: 'introduction'},
        ],
      },
    ])
    const resolver = createRouteResolver(client, 'web')
    const paths = await resolver.resolvePathByIds(['blog-hello', 'blog-intro'])
    expect(paths['blog-hello']).toBe('/blog/hello-world')
    expect(paths['blog-intro']).toBe('/blog/introduction')
  })

  it('omits unresolvable IDs', async () => {
    const client = createMockClient([
      {query: Q_CONFIG_BY_CHANNEL, params: {channel: 'web'}, result: WEB_CONFIG},
      {
        query: `*[_id in $ids]{_id, _type}`,
        params: {ids: ['blog-hello', 'nonexistent']},
        result: [
          {_id: 'blog-hello', _type: 'blogPost'},
        ],
      },
      {
        query: `*[_id in $groupIds]{"_id": _id, "path": slug.current}`,
        params: {groupIds: ['blog-hello']},
        result: [
          {_id: 'blog-hello', path: 'hello-world'},
        ],
      },
    ])
    const resolver = createRouteResolver(client, 'web')
    const paths = await resolver.resolvePathByIds(['blog-hello', 'nonexistent'])
    expect(paths['blog-hello']).toBe('/blog/hello-world')
    expect('nonexistent' in paths).toBe(false)
    expect(Object.keys(paths).length).toBe(1)
  })
})

describe('pathProjection', () => {
  it('returns GROQ projection string', async () => {
    const client = createMockClient([
      {query: Q_CONFIG_BY_CHANNEL, params: {channel: 'web'}, result: WEB_CONFIG},
    ])
    const resolver = createRouteResolver(client, 'web')
    const projection = await resolver.pathProjection('blogPost')
    expect(projection).toBe('"path": slug.current')
  })

  it('groqField deprecated alias returns same result', async () => {
    const client = createMockClient([
      {query: Q_CONFIG_BY_CHANNEL, params: {channel: 'web'}, result: WEB_CONFIG},
    ])
    const resolver = createRouteResolver(client, 'web')
    const fromPathProjection = await resolver.pathProjection('blogPost')
    const fromGroqField = await resolver.groqField('blogPost')
    expect(fromGroqField).toBe(fromPathProjection)
  })
})

describe('getPath', () => {
  it('extracts pathname from valid URL', () => {
    expect(getPath('https://www.example.com/blog/hello-world')).toBe('/blog/hello-world')
  })

  it('returns null for invalid URL', () => {
    expect(getPath('not-a-url')).toBeNull()
  })

  it('returns only pathname (no query params)', () => {
    expect(getPath('https://www.example.com/docs/setup?ref=nav&v=2')).toBe('/docs/setup')
  })
})
