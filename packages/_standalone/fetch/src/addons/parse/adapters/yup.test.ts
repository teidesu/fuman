import { describe, expect, it, vi } from 'vitest'
import * as y from 'yup'

import { createFfetch } from '../../../ffetch.js'
import { parser } from '../addon.js'

import { ffetchYupAdapter } from './yup.js'

describe('zod', () => {
  it('should parse a schema', async () => {
    const parser = ffetchYupAdapter()
    const res = await parser.parse(y.string(), 'hello')

    expect(res).toEqual('hello')
  })

  it('should safely parse a type (pass)', async () => {
    const parser = ffetchYupAdapter()
    const res = await parser.safeParse(y.string(), 'hello')

    expect(res).toMatchObject({ success: true, data: 'hello' })
  })

  it('should safely parse a type (fail)', async () => {
    const parser = ffetchYupAdapter({ action: 'validate', options: { strict: true } })
    const res = await parser.safeParse(y.string(), 42)

    expect(res).toMatchObject({ success: false })
  })

  it('should work with ffetch (pass)', async () => {
    const fetch_ = vi.fn<typeof fetch>()
      .mockImplementation(async () => new Response('{"a": 42}'))

    const ffetch = createFfetch({
      fetch: fetch_,
      addons: [parser(ffetchYupAdapter())],
    })

    const res = await ffetch('https://example.com').parsedJson(
      y.object({ a: y.number().required() }),
    )

    expect(res.a).toEqual(42)
  })

  it('should work with ffetch (failure)', async () => {
    const fetch_ = vi.fn<typeof fetch>()
      .mockImplementation(async () => new Response('{"b": 42}'))

    const ffetch = createFfetch({
      fetch: fetch_,
      addons: [parser(ffetchYupAdapter())],
    })

    const promise = ffetch('https://example.com').parsedJson(
      y.object({ a: y.number().required() }),
    )

    await expect(promise).rejects.toThrow(y.ValidationError)
  })
})
