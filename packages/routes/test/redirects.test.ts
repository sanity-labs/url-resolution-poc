import {describe, it, expect} from 'vitest'
import {getRedirects} from '../src/redirects.js'
import {createMockClient} from './helpers/mock-client.js'

const Q_ALL = `*[_type == "routes.redirect"] | order(from asc) { from, to, statusCode }`
const Q_AUTO = `*[_type == "routes.redirect" && source == $source] | order(from asc) { from, to, statusCode }`

describe('getRedirects', () => {
  it('returns empty array when no redirects exist', async () => {
    const client = createMockClient([
      {query: Q_ALL, params: {}, result: []},
    ])
    const result = await getRedirects(client)
    expect(result).toEqual([])
  })

  it('maps redirect documents to framework format', async () => {
    const client = createMockClient([
      {
        query: Q_ALL,
        params: {},
        result: [
          {from: '/blog/old-slug', to: '/blog/new-slug', statusCode: '301'},
          {from: '/docs/removed', to: '/docs/replacement', statusCode: '302'},
        ],
      },
    ])
    const result = await getRedirects(client)
    expect(result).toEqual([
      {source: '/blog/old-slug', destination: '/blog/new-slug', permanent: true, statusCode: 301},
      {source: '/docs/removed', destination: '/docs/replacement', permanent: false, statusCode: 302},
    ])
  })

  it('treats 308 as permanent', async () => {
    const client = createMockClient([
      {
        query: Q_ALL,
        params: {},
        result: [{from: '/a', to: '/b', statusCode: '308'}],
      },
    ])
    const result = await getRedirects(client)
    expect(result[0].permanent).toBe(true)
    expect(result[0].statusCode).toBe(308)
  })

  it('treats 307 as temporary', async () => {
    const client = createMockClient([
      {
        query: Q_ALL,
        params: {},
        result: [{from: '/a', to: '/b', statusCode: '307'}],
      },
    ])
    const result = await getRedirects(client)
    expect(result[0].permanent).toBe(false)
    expect(result[0].statusCode).toBe(307)
  })

  it('defaults to 301 when statusCode is missing', async () => {
    const client = createMockClient([
      {
        query: Q_ALL,
        params: {},
        result: [{from: '/a', to: '/b', statusCode: ''}],
      },
    ])
    const result = await getRedirects(client)
    expect(result[0].permanent).toBe(true)
    expect(result[0].statusCode).toBe(301)
  })

  it('filters by source when option provided', async () => {
    const client = createMockClient([
      {
        query: Q_AUTO,
        params: {source: 'auto'},
        result: [{from: '/blog/old', to: '/blog/new', statusCode: '301'}],
      },
    ])
    const result = await getRedirects(client, {source: 'auto'})
    expect(result).toHaveLength(1)
    expect(result[0].source).toBe('/blog/old')
  })
})
