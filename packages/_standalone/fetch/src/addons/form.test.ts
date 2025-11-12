import type { FetchLike } from '../_types.js'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createFfetch } from '../ffetch.js'
import { form } from './form.js'

const fetch_ = vi.fn<FetchLike>(async () => new Response('OK'))
const ffetch = createFfetch({ fetch: fetch_, addons: [form()] })

describe('ffetch/addons/form', () => {
  beforeEach(() => { fetch_.mockClear() })

  it('should handle form request body', async () => {
    fetch_.mockImplementationOnce(() => Promise.resolve(new Response('{"hello":"world"}')))

    await ffetch('https://example.com', {
      method: 'POST',
      form: {
        hello: 'world',
        array: [1, 2, 3],
      },
    })

    const req = fetch_.mock.calls[0][0] as Request
    expect(req.url).toBe('https://example.com/')
    expect(req.method).toBe('POST')
    expect(req.headers.get('Content-Type')).toBe('application/x-www-form-urlencoded')
    expect(await req.text()).toBe('hello=world&array=1&array=2&array=3')
  })
})
