import * as v from 'valibot'
import { describe, expect, it, vi } from 'vitest'

import { createFfetch } from '../../../ffetch.js'
import { parser } from '../addon.js'

import { ffetchValibotAdapter } from './valibot.js'

describe('zod', () => {
    it('should parse a schema', async () => {
        const parser = ffetchValibotAdapter()
        const res = await parser.parse(v.string(), 'hello')

        expect(res).toEqual('hello')
    })

    it('should parse a schema async', async () => {
        const parser = ffetchValibotAdapter({ async: true })
        const res = await parser.parse(v.string(), 'hello')

        expect(res).toEqual('hello')
    })

    it('should safely parse a type (pass)', async () => {
        const parser = ffetchValibotAdapter()
        const res = await parser.safeParse(v.string(), 'hello')

        expect(res).toMatchObject({ success: true, output: 'hello' })
    })

    it('should safely parse a type (fail)', async () => {
        const parser = ffetchValibotAdapter()
        const res = await parser.safeParse(v.string(), 42)

        expect(res).toMatchObject({ success: false })
    })

    it('should work with ffetch (pass)', async () => {
        const fetch_ = vi.fn<typeof fetch>()
            .mockImplementation(async () => new Response('{"a": 42}'))

        const ffetch = createFfetch({
            fetch: fetch_,
            addons: [parser(ffetchValibotAdapter())],
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
            addons: [parser(ffetchValibotAdapter())],
        })

        const promise = ffetch('https://example.com').parsedJson(
            v.object({ a: v.number() }),
        )

        await expect(promise).rejects.toThrow(v.ValiError)
    })
})
