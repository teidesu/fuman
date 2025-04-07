import { read, webReadableToFuman } from '@fuman/io'
import { asNonNull, utf8 } from '@fuman/utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createFfetch } from '../ffetch.js'

import { multipart } from './multipart.js'

const fetch_ = vi.fn<typeof fetch>(async () => new Response('OK'))
const ffetch = createFfetch({ fetch: fetch_, addons: [multipart()] })

describe('ffetch/addons/form', () => {
    beforeEach(() => { fetch_.mockClear() })

    it('should handle multipart request body', async () => {
        // todo: remove once we drop support for node 18
        if (typeof File === 'undefined') return

        fetch_.mockImplementationOnce(() => Promise.resolve(new Response('{"hello":"world"}')))

        const file = new File(['hello'], 'hello.txt')
        await ffetch('https://example.com', {
            method: 'POST',
            multipart: {
                foo: 'bar',
                array: [1, 2, 3],
                file,
            },
        })

        const req = fetch_.mock.calls[0][0] as Request
        expect(req.url).toBe('https://example.com/')
        expect(req.method).toBe('POST')
        expect(req.headers.get('Content-Type')).toMatch(/^multipart\/form-data; boundary=.+$/)

        const boundary = asNonNull(req.headers.get('Content-Type')?.split('boundary=')[1])
        const form = utf8.decoder.decode(await read.async.untilEnd(webReadableToFuman(asNonNull(req.body))))

        expect(form).toEqual([
            `--${boundary}`,
            'Content-Disposition: form-data; name="foo"',
            '',
            'bar',
            `--${boundary}`,
            'Content-Disposition: form-data; name="array"',
            '',
            '1',
            `--${boundary}`,
            'Content-Disposition: form-data; name="array"',
            '',
            '2',
            `--${boundary}`,
            'Content-Disposition: form-data; name="array"',
            '',
            '3',
            `--${boundary}`,
            'Content-Disposition: form-data; name="file"; filename="hello.txt"',
            'Content-Type: application/octet-stream',
            '',
            'hello',
            `--${boundary}--`,
        ].join('\r\n'))
    })
})
