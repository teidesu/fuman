import { CookieJar } from 'tough-cookie'

import { describe, expect, it, vi } from 'vitest'

import { createFfetch } from '../ffetch.js'
import { toughCookieAddon } from './tough-cookie.js'

describe('toughCookieAddon', () => {
    it('should use cookies from the jar', async () => {
        const fetch_ = vi.fn<typeof fetch>()
            .mockImplementation(async () => new Response('OK'))

        const jar = new CookieJar()
        jar.setCookieSync('hello=world', 'https://example.com')
        jar.setCookieSync('foo=bar', 'https://example.com')
        jar.setCookieSync('goodbye=world', 'https://not.example.com')

        const ffetch = createFfetch({
            fetch: fetch_,
            addons: [toughCookieAddon()],
            cookies: jar,
        })

        await ffetch('https://example.com')

        expect(fetch_).toHaveBeenCalledOnce()
        const req = fetch_.mock.calls[0][0] as Request

        expect(req.headers.get('Cookie')).toBe('hello=world; foo=bar')
    })

    it('should store cookies to the jar', async () => {
        const fetch_ = vi.fn<typeof fetch>()
            .mockImplementation(async () => {
                const res = new Response('OK', {
                    headers: {
                        'Set-Cookie': 'hello=world',
                    },
                })
                Object.defineProperty(res, 'url', { value: 'https://example.com' })
                return res
            })

        const jar = new CookieJar()

        const ffetch = createFfetch({
            fetch: fetch_,
            addons: [toughCookieAddon()],
            cookies: jar,
        })

        await ffetch('https://example.com')

        expect(fetch_).toHaveBeenCalledOnce()
        expect(await jar.getCookieString('https://example.com')).toBe('hello=world')
    })
})
