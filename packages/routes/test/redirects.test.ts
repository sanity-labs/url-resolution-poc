import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {getRedirects, _clearRedirectCache} from '../src/redirects.js'
import {createMockClient} from './helpers/mock-client.js'

const Q_ALL = `*[_type == "routes.redirect"] | order(from asc) { from, to, statusCode }`
const Q_AUTO = `*[_type == "routes.redirect" && source == $source] | order(from asc) { from, to, statusCode }`

const SAMPLE_REDIRECTS = [
  {from: '/blog/old-slug', to: '/blog/new-slug', statusCode: '301'},
  {from: '/docs/removed', to: '/docs/replacement', statusCode: '302'},
]

describe('getRedirects', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    _clearRedirectCache()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns empty array when no redirects exist', async () => {
    const client = createMockClient([
      {query: Q_ALL, params: {}, result: []},
    ])
    const result = await getRedirects(client)
    expect(result).toEqual([])
  })

  it('maps redirect documents to framework format', async () => {
    const client = createMockClient([
      {query: Q_ALL, params: {}, result: SAMPLE_REDIRECTS},
    ])
    const result = await getRedirects(client)
    expect(result).toEqual([
      {source: '/blog/old-slug', destination: '/blog/new-slug', permanent: true, statusCode: 301},
      {source: '/docs/removed', destination: '/docs/replacement', permanent: false, statusCode: 302},
    ])
  })

  it('treats 308 as permanent', async () => {
    const client = createMockClient([
      {query: Q_ALL, params: {}, result: [{from: '/a', to: '/b', statusCode: '308'}]},
    ])
    const result = await getRedirects(client)
    expect(result[0].permanent).toBe(true)
    expect(result[0].statusCode).toBe(308)
  })

  it('treats 307 as temporary', async () => {
    const client = createMockClient([
      {query: Q_ALL, params: {}, result: [{from: '/a', to: '/b', statusCode: '307'}]},
    ])
    const result = await getRedirects(client)
    expect(result[0].permanent).toBe(false)
    expect(result[0].statusCode).toBe(307)
  })

  it('defaults to 301 when statusCode is missing', async () => {
    const client = createMockClient([
      {query: Q_ALL, params: {}, result: [{from: '/a', to: '/b', statusCode: ''}]},
    ])
    const result = await getRedirects(client)
    expect(result[0].permanent).toBe(true)
    expect(result[0].statusCode).toBe(301)
  })

  it('filters by source when option provided', async () => {
    const client = createMockClient([
      {query: Q_AUTO, params: {source: 'auto'}, result: [{from: '/blog/old', to: '/blog/new', statusCode: '301'}]},
    ])
    const result = await getRedirects(client, {source: 'auto'})
    expect(result).toHaveLength(1)
    expect(result[0].source).toBe('/blog/old')
  })

  describe('cacheTtl', () => {
    it('returns cached results within TTL', async () => {
      const client = createMockClient([
        {query: Q_ALL, params: {}, result: SAMPLE_REDIRECTS},
      ])

      // First call — fetches from API
      const result1 = await getRedirects(client, {cacheTtl: 60_000})
      expect(result1).toHaveLength(2)
      expect(client.fetch).toHaveBeenCalledTimes(1)

      // Second call within TTL — returns cached
      const result2 = await getRedirects(client, {cacheTtl: 60_000})
      expect(result2).toEqual(result1)
      expect(client.fetch).toHaveBeenCalledTimes(1) // No additional fetch
    })

    it('refetches after TTL expires', async () => {
      const client = createMockClient([
        {query: Q_ALL, params: {}, result: SAMPLE_REDIRECTS},
        {query: Q_ALL, params: {}, result: SAMPLE_REDIRECTS},
      ])

      // First call
      await getRedirects(client, {cacheTtl: 60_000})
      expect(client.fetch).toHaveBeenCalledTimes(1)

      // Advance time past TTL
      vi.advanceTimersByTime(61_000)

      // Second call — cache expired, refetches
      await getRedirects(client, {cacheTtl: 60_000})
      expect(client.fetch).toHaveBeenCalledTimes(2)
    })

    it('uses separate caches for different source filters', async () => {
      const client = createMockClient([
        {query: Q_ALL, params: {}, result: SAMPLE_REDIRECTS},
        {query: Q_AUTO, params: {source: 'auto'}, result: [{from: '/a', to: '/b', statusCode: '301'}]},
      ])

      // Fetch all
      const all = await getRedirects(client, {cacheTtl: 60_000})
      expect(all).toHaveLength(2)

      // Fetch auto — different cache key, triggers new fetch
      const auto = await getRedirects(client, {source: 'auto', cacheTtl: 60_000})
      expect(auto).toHaveLength(1)

      expect(client.fetch).toHaveBeenCalledTimes(2)
    })

    it('does not cache when cacheTtl is omitted', async () => {
      const client = createMockClient([
        {query: Q_ALL, params: {}, result: SAMPLE_REDIRECTS},
        {query: Q_ALL, params: {}, result: SAMPLE_REDIRECTS},
      ])

      await getRedirects(client)
      await getRedirects(client)

      // Both calls should fetch — no caching
      expect(client.fetch).toHaveBeenCalledTimes(2)
    })
  })
})
