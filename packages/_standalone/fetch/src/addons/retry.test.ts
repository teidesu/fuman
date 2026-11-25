import type { FetchLike } from '../_types.js'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createFfetch, HttpError } from '../ffetch.js'
import { RetriesExceededError, retry } from './retry.js'

const fetch_ = vi.fn<FetchLike>(async () => new Response('OK'))
const ffetch = createFfetch({
  fetch: fetch_,
  addons: [retry()],
  retry: {
    retryDelay: 10,
  },
})

describe('ffetch/addons/retry', () => {
  beforeEach(() => { fetch_.mockClear() })

  it('should retry on 500', async () => {
    let retries = 0
    fetch_.mockImplementation(async () => {
      if (retries++ < 2) {
        return new Response(null, { status: 500 })
      }

      return new Response('OK!', { status: 200 })
    })

    const res = await ffetch('https://example.com')

    expect(fetch_).toHaveBeenCalledTimes(3)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('OK!')
  })

  it('should customize retry predicate', async () => {
    let retries = 0
    fetch_.mockImplementation(async () => {
      if (retries++ < 2) {
        return new Response(null, { status: 500 })
      }

      return new Response('Bad request', { status: 400 })
    })

    const res = ffetch('https://example.com', {
      retry: {
        onResponse: (res) => {
          return res.status !== 500
        },
      },
    })

    await expect(res).rejects.toThrow(HttpError)
    expect(fetch_).toHaveBeenCalledTimes(3)
  })

  it('should stop retrying after maxRetries', async () => {
    fetch_.mockImplementation(async () => {
      return new Response(null, { status: 500 })
    })

    const res = ffetch('https://example.com', {
      retry: {
        maxRetries: 3,
      },
    })

    await expect(res).rejects.toThrow(RetriesExceededError)
    expect(fetch_).toHaveBeenCalledTimes(4)
  })

  it('should default to maxRetries=5', async () => {
    fetch_.mockImplementation(async () => {
      return new Response(null, { status: 500 })
    })

    const res = ffetch('https://example.com')

    await expect(res).rejects.toThrow(RetriesExceededError)
    expect(fetch_).toHaveBeenCalledTimes(6)
  })

  it('should retry with custom delay', async () => {
    let retries = 0
    fetch_.mockImplementation(async () => {
      if (retries++ < 2) {
        return new Response(null, { status: 500 })
      }

      return new Response('OK!', { status: 200 })
    })

    const setTimeout_ = vi.spyOn(globalThis, 'setTimeout')

    const res = await ffetch('https://example.com', {
      retry: {
        retryDelay: 20,
      },
    })

    expect(fetch_).toHaveBeenCalledTimes(3)
    expect(setTimeout_).toHaveBeenCalledTimes(2)
    expect(setTimeout_).toHaveBeenNthCalledWith(1, expect.any(Function), 20)
    expect(setTimeout_).toHaveBeenNthCalledWith(2, expect.any(Function), 20)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('OK!')

    setTimeout_.mockRestore()
  })

  it('should retry a POST body by cloning the request', async () => {
    const bodies: string[] = []
    fetch_.mockImplementation(async (req) => {
      bodies.push(await req.text())
      return bodies.length < 2 ? new Response(null, { status: 500 }) : new Response('OK')
    })

    const res = await ffetch('https://example.com', {
      method: 'POST',
      body: 'payload',
      retry: { maxRetries: 2, retryDelay: 0 },
    })

    expect(bodies).toEqual(['payload', 'payload'])
    expect(res.status).toBe(200)
  })

  it('should return the last response when returnLastResponse is true', async () => {
    fetch_.mockImplementation(async () => new Response('still failing', { status: 503 }))

    const res = await ffetch('https://example.com', {
      validateResponse: false,
      retry: { maxRetries: 1, retryDelay: 0, returnLastResponse: true },
    })

    expect(res.status).toBe(503)
    expect(await res.text()).toBe('still failing')
  })
})
