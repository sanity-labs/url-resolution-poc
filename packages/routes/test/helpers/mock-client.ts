import type {SanityClient} from '@sanity/client'
import {vi} from 'vitest'

interface MockFetchResponse {
  query: string
  params?: Record<string, unknown>
  result: unknown
}

export function createMockClient(responses: MockFetchResponse[]): SanityClient {
  const fetch = vi.fn(async (query: string, params?: Record<string, unknown>) => {
    const match = responses.find(
      (r) =>
        r.query === query &&
        JSON.stringify(r.params) === JSON.stringify(params),
    )
    if (!match) {
      throw new Error(
        `Unexpected query: ${query} with params: ${JSON.stringify(params)}`,
      )
    }
    return match.result
  })

  return {
    fetch,
    listen: vi.fn(() => ({
      subscribe: vi.fn(() => ({unsubscribe: vi.fn()})),
    })),
    patch: vi.fn(() => ({
      setIfMissing: vi.fn().mockReturnThis(),
      unset: vi.fn().mockReturnThis(),
      commit: vi.fn(),
    })),
    createOrReplace: vi.fn(),
    transaction: vi.fn(() => ({
      createOrReplace: vi.fn().mockReturnThis(),
      createIfNotExists: vi.fn().mockReturnThis(),
      patch: vi.fn().mockReturnThis(),
      commit: vi.fn(),
    })),
    config: vi.fn(() => ({})),
    withConfig: vi.fn().mockReturnThis(),
  } as unknown as SanityClient
}
