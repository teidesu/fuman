import { describe, expect, it, vi } from 'vitest'

import { createFfetch } from '../ffetch.js'

import { timeout, TimeoutError } from './timeout.js'

const fetch_ = vi.fn<typeof fetch>((req_) => {
  const req = req_ as Request
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      resolve(new Response('OK'))
    }, 1000)

    req.signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(req.signal?.reason)
    })
  })
})

const ffetch = createFfetch({
  fetch: fetch_,
  addons: [timeout()],
})

describe('ffetch/addons/timeout', () => {
  it('should timeout', async () => {
    const promise = ffetch('https://example.com', {
      timeout: 10,
    })

    await expect(promise).rejects.toThrow(TimeoutError)
  })

  it('should inherit timeout from base options', async () => {
    const base = createFfetch({
      fetch: fetch_,
      addons: [timeout()],
      timeout: 10,
    })

    const promise = base('https://example.com')

    await expect(promise).rejects.toThrow(TimeoutError)
  })

  it('should disable timeout if Infinity is passed', async () => {
    const base = createFfetch({
      fetch: fetch_,
      addons: [timeout()],
      timeout: 10,
    })

    const promise = base('https://example.com', { timeout: Infinity })

    expect((await promise).status).toBe(200)
  })

  it('should work with abort signals', async () => {
    const controller = new AbortController()

    const promise = ffetch('https://example.com', {
      timeout: 100,
      extra: {
        signal: controller.signal,
      },
    })

    const err = new Error('uwu')
    setTimeout(() => controller.abort(err), 10)

    await expect(promise).rejects.toThrow(err)
  })
})
