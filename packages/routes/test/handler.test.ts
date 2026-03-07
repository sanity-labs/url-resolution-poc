import {describe, it, expect} from 'vitest'
import {getPublishedId} from '@sanity/id-utils'

describe('handler', () => {
  describe('document ID normalization via @sanity/id-utils', () => {
    it('strips drafts. prefix', () => {
      expect(getPublishedId('drafts.article-123')).toBe('article-123')
    })

    it('leaves published IDs unchanged', () => {
      expect(getPublishedId('article-123')).toBe('article-123')
    })

    it('strips versions. prefix', () => {
      expect(getPublishedId('versions.abc123.article-123')).toBe('article-123')
    })
  })

  // Integration tests deferred — documentEventHandler wrapping makes unit testing impractical
  it.todo('create event — entry added to shard')
  it.todo('update event — entry updated in shard')
  it.todo('delete event — entry removed from shard')
  it.todo('non-routable type — skipped')
  it.todo('locale-aware create — entries in all locale shards')
  it.todo('locale-aware delete — removed from all locale shards')
  it.todo('error recovery — logged, does not crash')
})
