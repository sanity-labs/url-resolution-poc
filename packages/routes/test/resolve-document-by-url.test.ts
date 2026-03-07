import {describe, it, expect} from 'vitest'
import {createRouteResolver} from '../src/resolver.js'
import {createMockClient} from './helpers/mock-client.js'
import {WEB_CONFIG, BLOG_SHARD, ARTICLE_SHARD} from './helpers/fixtures.js'

const Q_CONFIG_BY_CHANNEL = `*[_type == "routes.config" && channel == $channel][0]`
const Q_ALL_SHARDS = `*[_id in $shardIds]`

describe('resolveDocumentByUrl', () => {
  function makeResolver(shards = [BLOG_SHARD, ARTICLE_SHARD]) {
    const client = createMockClient([
      {query: Q_CONFIG_BY_CHANNEL, params: {channel: 'web'}, result: WEB_CONFIG},
      {
        query: Q_ALL_SHARDS,
        params: {shardIds: ['routes-web-blogPost', 'routes-web-article', 'routes-web-product']},
        result: shards,
      },
    ])
    return createRouteResolver(client, 'web')
  }

  it('exact match — full URL', async () => {
    const resolver = makeResolver()
    const result = await resolver.resolveDocumentByUrl('https://www.example.com/blog/hello-world')
    expect(result).toEqual({id: 'blog-hello', type: 'blogPost'})
  })

  it('returns null when no match', async () => {
    const resolver = makeResolver()
    const result = await resolver.resolveDocumentByUrl('https://www.example.com/blog/nonexistent')
    expect(result).toBeNull()
  })

  it('trailing slash tolerance', async () => {
    const resolver = makeResolver()
    const result = await resolver.resolveDocumentByUrl('https://www.example.com/blog/hello-world/')
    expect(result).toEqual({id: 'blog-hello', type: 'blogPost'})
  })

  it('path-only input', async () => {
    const resolver = makeResolver()
    const result = await resolver.resolveDocumentByUrl('/blog/hello-world')
    expect(result).toEqual({id: 'blog-hello', type: 'blogPost'})
  })

  it('query params stripped', async () => {
    const resolver = makeResolver()
    const result = await resolver.resolveDocumentByUrl('https://www.example.com/blog/hello-world?utm_source=test')
    expect(result).toEqual({id: 'blog-hello', type: 'blogPost'})
  })

  it('resolves article with nested path', async () => {
    const resolver = makeResolver()
    const result = await resolver.resolveDocumentByUrl('/docs/getting-started/setup')
    expect(result).toEqual({id: 'article-setup', type: 'article'})
  })
})
