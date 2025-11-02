import * as v from 'valibot'
import { describe, expect, it, vi } from 'vitest'

import { createFfetch } from '../../ffetch.js'
import { parser } from './addon.js'

describe('zod', () => {
  it('should work with ffetch (pass)', async () => {
    const fetch_ = vi.fn<typeof fetch>()
      .mockImplementation(async () => new Response('{"a": 42}'))

    const ffetch = createFfetch({
      fetch: fetch_,
      addons: [parser()],
    })

    const res = await ffetch('https://example.com').parsedJson(
      v.object({ a: v.number() }),
    )

    expect(res.a).toEqual(42)
  })

  it('should work with ffetch (failure)', async () => {
    const fetch_ = vi.fn<typeof fetch>()
      .mockImplementation(async () => new Response('{"b": 42}'))

    const ffetch = createFfetch({
      fetch: fetch_,
      addons: [parser()],
    })

    const promise = ffetch('https://example.com').parsedJson(
      v.object({ a: v.number() }),
    )

    await expect(promise).rejects.toThrowErrorMatchingInlineSnapshot('[Error: Schema validation failed: Invalid key: Expected "a" but received undefined at .a]')
  })

  it('should work with ffetch safelyParsedJson (pass)', async () => {
    const fetch_ = vi.fn<typeof fetch>()
      .mockImplementation(async () => new Response('{"a": 42}'))

    const ffetch = createFfetch({
      fetch: fetch_,
      addons: [parser()],
    })

    const res = await ffetch('https://example.com').safelyParsedJson(
      v.object({ a: v.number() }),
    )

    expect(res.issues).toBeUndefined()
    if (!res.issues) {
      expect(res.value).toEqual({ a: 42 })
    }
  })

  it('should work with ffetch safelyParsedJson (failure)', async () => {
    const fetch_ = vi.fn<typeof fetch>()
      .mockImplementation(async () => new Response('{"b": 42}'))

    const ffetch = createFfetch({
      fetch: fetch_,
      addons: [parser()],
    })

    const res = await ffetch('https://example.com').safelyParsedJson(
      v.object({ a: v.number() }),
    )

    expect(res.issues).toBeDefined()
    if (res.issues) {
      expect(res.issues).toHaveLength(1)
      expect(res.issues[0].message).toContain('Expected "a" but received undefined')
    }
  })
})
