import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createFfetch } from '../ffetch.js'

import { query } from './query.js'

const fetch_ = vi.fn<typeof fetch>(async () => new Response('OK'))
const ffetch = createFfetch({ fetch: fetch_, addons: [query()] })

describe('ffetch/addons/query', () => {
    beforeEach(() => { fetch_.mockClear() })

    it('should pass query params', async () => {
        const res = await ffetch('https://example.com', {
            query: {
                foo: 'bar',
            },
        })

        const req = fetch_.mock.calls[0][0] as Request
        expect(req.url).toBe('https://example.com/?foo=bar')
        expect(await res.text()).toBe('OK')
    })

    it('should handle multiple query params', async () => {
        const res = await ffetch('https://example.com', {
            query: {
                foo: 'bar',
                baz: ['qux', 'quux'],
            },
        })

        const req = fetch_.mock.calls[0][0] as Request
        expect(req.url).toBe('https://example.com/?foo=bar&baz=qux&baz=quux')

        expect(await res.text()).toBe('OK')
    })

    it('should merge query params with the ones in the URL', async () => {
        const res = await ffetch('https://example.com?foo=bar', {
            query: {
                baz: ['qux', 'quux'],
            },
        })

        const req = fetch_.mock.calls[0][0] as Request
        expect(req.url).toBe('https://example.com/?foo=bar&baz=qux&baz=quux')

        expect(await res.text()).toBe('OK')
    })

    it('should not override query params in the URL', async () => {
        const res = await ffetch('https://example.com?foo=bar', {
            query: {
                foo: 'baz',
            },
        })

        const req = fetch_.mock.calls[0][0] as Request
        expect(req.url).toBe('https://example.com/?foo=bar&foo=baz')

        expect(await res.text()).toBe('OK')
    })

    it('should merge query params', async () => {
        const ffetch = createFfetch({
            fetch: fetch_,
            addons: [query()],
            query: {
                foo: 'bar',
            },
        })
        const res = await ffetch('https://example.com/path', {
            query: {
                foo: 'baz',
                baz: ['qux', 'quux'],
            },
        })

        const req = fetch_.mock.calls[0][0] as Request
        // nb: `foo` is overridden
        expect(req.url).toBe('https://example.com/path?foo=baz&baz=qux&baz=quux')

        expect(await res.text()).toBe('OK')
    })
})
