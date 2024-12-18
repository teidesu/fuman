import * as v from '@badrap/valita'
import { describe, expect, it, vi } from 'vitest'

import { createFfetch } from '../../../ffetch.js'
import { parser } from '../addon.js'

import { ffetchValitaAdapter } from './valita.js'

describe('valita', () => {
    it('should parse a Type', async () => {
        const parser = ffetchValitaAdapter()
        const res = await parser.parse(v.string(), 'hello')

        expect(res).toEqual('hello')
    })

    it('should work with ffetch (pass)', async () => {
        const fetch_ = vi.fn<typeof fetch>()
            .mockImplementation(async () => new Response('{"a": 42}'))

        const ffetch = createFfetch({
            fetch: fetch_,
            addons: [parser(ffetchValitaAdapter())],
        })

        const res = await ffetch('https://example.com').parsedJson(v.object({ a: v.number() }))

        expect(res.a).toEqual(42)
    })

    it('should work with ffetch (failure)', async () => {
        const fetch_ = vi.fn<typeof fetch>()
            .mockImplementation(async () => new Response('{"b": 42}'))

        const ffetch = createFfetch({
            fetch: fetch_,
            addons: [parser(ffetchValitaAdapter())],
        })

        const promise = ffetch('https://example.com').parsedJson(v.object({ a: v.number() }))

        await expect(promise).rejects.toThrow(v.ValitaError)
    })
})
