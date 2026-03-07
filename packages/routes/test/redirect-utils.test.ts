import {describe, it, expect} from 'vitest'
import {normalizePath, slugifyRedirectId} from '../src/redirect-utils.js'

describe('normalizePath', () => {
  it('adds leading slash', () => {
    expect(normalizePath('blog/post')).toBe('/blog/post')
  })

  it('collapses double slashes', () => {
    expect(normalizePath('/blog//post')).toBe('/blog/post')
  })

  it('removes trailing slash', () => {
    expect(normalizePath('/blog/post/')).toBe('/blog/post')
  })

  it('handles root path', () => {
    expect(normalizePath('/')).toBe('/')
  })

  it('handles empty string', () => {
    expect(normalizePath('')).toBe('/')
  })

  it('normalizes complex path', () => {
    expect(normalizePath('//blog///old-slug//')).toBe('/blog/old-slug')
  })
})

describe('slugifyRedirectId', () => {
  it('creates deterministic ID from path', () => {
    expect(slugifyRedirectId('/blog/old-slug')).toBe('redirect-blog-old-slug')
  })

  it('handles nested paths', () => {
    expect(slugifyRedirectId('/docs/section/page')).toBe('redirect-docs-section-page')
  })

  it('strips special characters', () => {
    expect(slugifyRedirectId('/blog/hello world!')).toBe('redirect-blog-helloworld')
  })

  it('handles root path', () => {
    expect(slugifyRedirectId('/')).toBe('redirect-')
  })
})
