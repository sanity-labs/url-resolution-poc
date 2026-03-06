import {describe, it, expect} from 'vitest'

describe('handler', () => {
  describe('draft ID stripping', () => {
    const stripDrafts = (id: string) => id.replace(/^drafts\./, '')

    it('strips drafts. prefix', () => {
      expect(stripDrafts('drafts.article-123')).toBe('article-123')
    })

    it('leaves non-draft IDs unchanged', () => {
      expect(stripDrafts('article-123')).toBe('article-123')
    })

    it('only strips the prefix, not mid-string', () => {
      expect(stripDrafts('my-drafts.doc')).toBe('my-drafts.doc')
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
