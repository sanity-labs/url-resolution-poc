import {describe, it, expect, vi} from 'vitest'
import {uniqueSlug} from '../src/validation.js'

function createMockContext(overrides: {
  type?: string
  id?: string
  fetchResult?: number
}) {
  const {type = 'article', id = 'drafts.article-1', fetchResult = 0} = overrides
  const mockFetch = vi.fn().mockResolvedValue(fetchResult)
  return {
    document: {_id: id, _type: type},
    getClient: vi.fn(() => ({fetch: mockFetch})),
    _mockFetch: mockFetch,
  }
}

describe('uniqueSlug', () => {
  it('returns true when slug is unique', async () => {
    const validate = uniqueSlug()
    const ctx = createMockContext({fetchResult: 0})
    const result = await validate({current: 'my-slug', _type: 'slug'}, ctx as any)
    expect(result).toBe(true)
  })

  it('returns error when slug is duplicate', async () => {
    const validate = uniqueSlug()
    const ctx = createMockContext({fetchResult: 1})
    const result = await validate({current: 'duplicate-slug', _type: 'slug'}, ctx as any)
    expect(result).toBe('Another article already uses slug "duplicate-slug"')
  })

  it('returns error when slug is empty', async () => {
    const validate = uniqueSlug()
    const ctx = createMockContext({})
    const result = await validate(undefined, ctx as any)
    expect(result).toBe('Slug is required')
  })

  it('returns error when slug.current is empty', async () => {
    const validate = uniqueSlug()
    const ctx = createMockContext({})
    const result = await validate({current: '', _type: 'slug'}, ctx as any)
    expect(result).toBe('Slug is required')
  })

  it('excludes both draft and published IDs from duplicate check', async () => {
    const validate = uniqueSlug()
    const ctx = createMockContext({id: 'drafts.article-1', fetchResult: 0})
    await validate({current: 'test', _type: 'slug'}, ctx as any)

    expect(ctx._mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        draftId: 'drafts.article-1',
        publishedId: 'article-1',
      }),
    )
  })

  it('uses custom field name when provided', async () => {
    const validate = uniqueSlug({field: 'permalink'})
    const ctx = createMockContext({fetchResult: 0})
    await validate({current: 'test', _type: 'slug'}, ctx as any)

    const query = ctx._mockFetch.mock.calls[0][0]
    expect(query).toContain('permalink.current')
  })
})
