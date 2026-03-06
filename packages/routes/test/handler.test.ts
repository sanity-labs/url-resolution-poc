import {describe, it} from 'vitest'

/**
 * Handler tests are deferred to integration testing.
 *
 * The handler wraps `documentEventHandler` from `@sanity/functions`,
 * making it difficult to unit test without mocking the entire Functions runtime.
 * These tests should be implemented as integration tests against a real dataset.
 */
describe('handler', () => {
  it.todo('create event — entry added to shard')
  it.todo('update event — entry updated in shard')
  it.todo('delete event — entry removed from shard')
  it.todo('non-routable type — skipped')
  it.todo('locale-aware create — entries in all locale shards')
  it.todo('locale-aware delete — removed from all locale shards')
  it.todo('error recovery — logged, does not crash')
  it.todo('draft ID stripping — drafts. prefix removed')
})
