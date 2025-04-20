import { describe, expect, it, vi } from 'vitest'
import { z, ZodError } from 'zod'

import { createFfetch } from '../../../ffetch.js'
import { parser } from '../addon.js'

import { ffetchZodAdapter } from './zod.js'

describe('zod', () => {
  it('should parse a ZodType', async () => {
    const parser = ffetchZodAdapter()
    const res = await parser.parse(z.string(), 'hello')

    expect(res).toEqual('hello')
  })

  it('should parse a ZodType async', async () => {
    const parser = ffetchZodAdapter({ async: true })
    const res = await parser.parse(z.string(), 'hello')

    expect(res).toEqual('hello')
  })

  it('should safely parse a type (pass)', async () => {
    const parser = ffetchZodAdapter()
    const res = await parser.safeParse(z.string(), 'hello')

    expect(res).toMatchObject({ success: true, data: 'hello' })
  })

  it('should safely parse a type (fail)', async () => {
    const parser = ffetchZodAdapter()
    const res = await parser.safeParse(z.string(), 42)

    expect(res).toMatchObject({ success: false })
  })

  it('should work with ffetch (pass)', async () => {
    const fetch_ = vi.fn<typeof fetch>()
      .mockImplementation(async () => new Response('{"a": 42}'))

    const ffetch = createFfetch({
      fetch: fetch_,
      addons: [parser(ffetchZodAdapter())],
    })

    const res = await ffetch('https://example.com').parsedJson(z.object({ a: z.number() }))

    expect(res.a).toEqual(42)
  })

  it('should work with ffetch (failure)', async () => {
    const fetch_ = vi.fn<typeof fetch>()
      .mockImplementation(async () => new Response('{"b": 42}'))

    const ffetch = createFfetch({
      fetch: fetch_,
      addons: [parser(ffetchZodAdapter())],
    })

    const promise = ffetch('https://example.com').parsedJson(z.object({ a: z.number() }))

    await expect(promise).rejects.toThrow(ZodError)
  })
})
