import { describe, expect, it, vi } from 'vitest'

import { createFfetch } from '../ffetch.js'
import { rateLimitHandler } from './rate-limit.js'

describe('rateLimitHandler', () => {
  it('should handle rate limit errors', async () => {
    let times = 0
    const fetch_ = vi.fn<typeof fetch>()
      .mockImplementation(async () => {
        switch (times++) {
          case 0:
          case 1:
            return new Response(null, {
              status: 429,
              headers: {
                'X-RateLimit-Reset': '0',
              },
            })
          default:
            return new Response('OK')
        }
      })

    const ffetch = createFfetch({
      fetch: fetch_,
      addons: [rateLimitHandler()],
      rateLimit: {
        defaultWaitTime: 0,
        jitter: 0,
      },
    })

    const res = await ffetch('https://example.com').text()
    expect(fetch_).toHaveBeenCalledTimes(3)
    expect(res).toBe('OK')
  })

  it('should use isRejected', async () => {
    let times = 0
    const fetch_ = vi.fn<typeof fetch>()
      .mockImplementation(async () => {
        switch (times++) {
          case 0:
          case 1:
            return new Response(null, {
              status: 599,
              headers: {
                'X-RateLimit-Reset': '0',
              },
            })
          default:
            return new Response('OK')
        }
      })

    const ffetch = createFfetch({
      fetch: fetch_,
      addons: [rateLimitHandler()],
      rateLimit: {
        isRejected: res => res.status === 599,
        defaultWaitTime: 0,
        jitter: 0,
      },
    })

    const res = await ffetch('https://example.com').text()
    expect(fetch_).toHaveBeenCalledTimes(3)
    expect(res).toBe('OK')
  })

  it('should use getReset', async () => {
    vi.setSystemTime(0)
    let times = 0
    const fetch_ = vi.fn<typeof fetch>()
      .mockImplementation(async () => {
        switch (times++) {
          case 0:
          case 1:
            return new Response(null, {
              status: 429,
            })
          default:
            return new Response('OK')
        }
      })

    const setTimeout_ = vi.spyOn(globalThis, 'setTimeout')

    const ffetch = createFfetch({
      fetch: fetch_,
      addons: [rateLimitHandler()],
      rateLimit: {
        getReset: () => 0.1,
        defaultWaitTime: 0,
        jitter: 0,
      },
    })

    const res = await ffetch('https://example.com').text()
    expect(fetch_).toHaveBeenCalledTimes(3)
    expect(setTimeout_).toHaveBeenCalledTimes(2)
    expect(setTimeout_).toHaveBeenNthCalledWith(1, expect.any(Function), 100)
    expect(setTimeout_).toHaveBeenNthCalledWith(2, expect.any(Function), 100)
    expect(res).toBe('OK')
  })

  it('should wait for the default time if getReset returns null', async () => {
    let times = 0
    const fetch_ = vi.fn<typeof fetch>()
      .mockImplementation(async () => {
        switch (times++) {
          case 0:
          case 1:
            return new Response(null, {
              status: 429,
              headers: {
                'X-RateLimit-Reset': '0',
              },
            })
          default:
            return new Response('OK')
        }
      })

    const setTimeout_ = vi.spyOn(globalThis, 'setTimeout')
    const ffetch = createFfetch({
      fetch: fetch_,
      addons: [rateLimitHandler()],
      rateLimit: {
        getReset: () => null,
        defaultWaitTime: 100,
        jitter: 0,
      },
    })

    const res = await ffetch('https://example.com').text()

    expect(fetch_).toHaveBeenCalledTimes(3)
    expect(setTimeout_).toHaveBeenCalledTimes(2)
    expect(setTimeout_).toHaveBeenNthCalledWith(1, expect.any(Function), 100)
    expect(setTimeout_).toHaveBeenNthCalledWith(2, expect.any(Function), 100)
    expect(res).toBe('OK')

    setTimeout_.mockRestore()
  })

  it('should add jitter to the wait time', async () => {
    vi.setSystemTime(0)

    let times = 0
    const fetch_ = vi.fn<typeof fetch>()
      .mockImplementation(async () => {
        switch (times++) {
          case 0:
          case 1:
            return new Response(null, {
              status: 429,
              headers: {
                'X-RateLimit-Reset': '0',
              },
            })
          default:
            return new Response('OK')
        }
      })

    const setTimeout_ = vi.spyOn(globalThis, 'setTimeout')
    const ffetch = createFfetch({
      fetch: fetch_,
      addons: [rateLimitHandler()],
      rateLimit: {
        getReset: () => 0.1,
        jitter: 5,
      },
    })

    const res = await ffetch('https://example.com').text()

    expect(fetch_).toHaveBeenCalledTimes(3)
    expect(setTimeout_).toHaveBeenCalledTimes(2)
    expect(setTimeout_).toHaveBeenNthCalledWith(1, expect.any(Function), 105)
    expect(setTimeout_).toHaveBeenNthCalledWith(2, expect.any(Function), 105)
    expect(res).toBe('OK')

    setTimeout_.mockRestore()
  })

  it('should throw if reset time is too far in the future', async () => {
    vi.setSystemTime(0)

    let times = 0
    const fetch_ = vi.fn<typeof fetch>()
      .mockImplementation(async () => {
        switch (times++) {
          case 0:
          case 1:
            return new Response(null, {
              status: 429,
              headers: {
                'X-RateLimit-Reset': '0',
              },
            })
          default:
            return new Response('OK')
        }
      })

    const setTimeout_ = vi.spyOn(globalThis, 'setTimeout')
    const ffetch = createFfetch({
      fetch: fetch_,
      addons: [rateLimitHandler()],
      rateLimit: {
        getReset: () => 10,
        maxWaitTime: 1000,
      },
    })

    await expect(ffetch('https://example.com')).rejects.toThrow('Rate limit exceeded')

    setTimeout_.mockRestore()
  })
})
