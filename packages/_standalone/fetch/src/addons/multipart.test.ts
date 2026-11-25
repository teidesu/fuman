import type { FetchLike } from '../_types.js'
import { read, webReadableToFuman } from '@fuman/io'
import { asNonNull, utf8 } from '@fuman/utils'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createFfetch } from '../ffetch.js'
import { multipart } from './multipart.js'

const fetch_ = vi.fn<FetchLike>(async () => new Response('OK'))
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

    expect(form.trimEnd()).toEqual([
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

  it('should skip nullish values, objects, and functions', async () => {
    await ffetch('https://example.com', {
      multipart: {
        a: null,
        b: undefined,
        c: 0,
        d: false,
        e: { nested: true },
        f: () => {},
        g: 'ok',
      },
    })

    const req = fetch_.mock.calls[0][0] as Request
    const body = await req.formData()
    expect([...body.entries()]).toEqual([
      ['c', '0'],
      ['d', 'false'],
      ['g', 'ok'],
    ])
  })

  it('should append File and Blob as-is, including inside arrays', async () => {
    if (typeof File === 'undefined') return

    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' })
    const blob = new Blob(['bin'], { type: 'application/octet-stream' })

    await ffetch('https://example.com', {
      multipart: {
        file,
        blob,
        files: [file, null, blob],
        tags: ['x', undefined, 'y'],
        obj: { n: 1 },
      },
    })

    const req = fetch_.mock.calls[0][0] as Request
    const entries = [...(await req.formData()).entries()].map(([key, value]) => {
      if (typeof value === 'string') {
        return { key, kind: 'string', name: undefined as string | undefined, text: value }
      }
      return { key, kind: 'file', name: (value as File).name, text: undefined as string | undefined }
    })

    expect(entries).toEqual([
      { key: 'file', kind: 'file', name: 'hello.txt', text: undefined },
      { key: 'blob', kind: 'file', name: 'blob', text: undefined },
      { key: 'files', kind: 'file', name: 'hello.txt', text: undefined },
      { key: 'files', kind: 'file', name: 'blob', text: undefined },
      { key: 'tags', kind: 'string', name: undefined, text: 'x' },
      { key: 'tags', kind: 'string', name: undefined, text: 'y' },
    ])
  })
})
