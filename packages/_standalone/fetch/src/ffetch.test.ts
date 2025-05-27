import type { FfetchMiddleware } from './_types.js'
import type { FfetchAddon } from './addons/types.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createFfetch, HttpError } from './ffetch.js'

const fetch_ = vi.fn<typeof fetch>(async () => new Response('OK'))
const ffetch = createFfetch({ fetch: fetch_ })

describe('ffetch', () => {
  beforeEach(() => { fetch_.mockClear() })

  it('should send a GET request', async () => {
    const res = await ffetch('https://example.com')

    const req = fetch_.mock.calls[0][0] as Request
    expect(req.url).toBe('https://example.com/')

    expect(await res.text()).toBe('OK')
  })

  it('should send a POST request', async () => {
    const body = new Uint8Array([1, 2, 3])
    const res = await ffetch('https://example.com', {
      method: 'POST',
      body,
    })

    const req = fetch_.mock.calls[0][0] as Request
    expect(req.url).toBe('https://example.com/')
    expect(req.method).toBe('POST')
    expect(await res.text()).toBe('OK')
  })

  it('should handle baseUrl when a url is passed', async () => {
    const res = await ffetch('https://example.com', {
      baseUrl: 'https://base.com',
    })

    const req = fetch_.mock.calls[0][0] as Request
    expect(req.url).toBe('https://example.com/')
    expect(await res.text()).toBe('OK')
  })

  it('should handle baseUrl when path is passed', async () => {
    const res = await ffetch('/path', {
      baseUrl: 'https://base.com',
    })

    const req = fetch_.mock.calls[0][0] as Request
    expect(req.url).toBe('https://base.com/path')
    expect(await res.text()).toBe('OK')
  })

  it('should pass extra options', async () => {
    const res = await ffetch('https://example.com', {
      extra: {
        signal: new AbortController().signal,
      },
    })

    const req = fetch_.mock.calls[0][0] as Request
    expect(req.url).toBe('https://example.com/')
    expect(req.signal).toBeInstanceOf(AbortSignal)
    expect(await res.text()).toBe('OK')
  })

  it('should handle json request body', async () => {
    fetch_.mockImplementationOnce(() => Promise.resolve(new Response('{"hello":"world"}')))

    await ffetch('https://example.com', {
      method: 'POST',
      json: { hello: 'world' },
    })

    const req = fetch_.mock.calls[0][0] as Request
    expect(req.url).toBe('https://example.com/')
    expect(req.method).toBe('POST')
    expect(req.headers.get('Content-Type')).toBe('application/json')
    expect(await req.json()).toEqual({ hello: 'world' })
  })

  it('should pass headers', async () => {
    const res = await ffetch('https://example.com', {
      headers: {
        'X-Header': 'value',
      },
    })

    const req = fetch_.mock.calls[0][0] as Request
    expect(req.url).toBe('https://example.com/')
    expect(req.headers.get('X-Header')).toBe('value')
    expect(await res.text()).toBe('OK')
  })

  it('should handle Headers', async () => {
    const res = await ffetch('https://example.com', {
      headers: new Headers({
        'X-Header': 'value',
      }),
    })

    const req = fetch_.mock.calls[0][0] as Request
    expect(req.url).toBe('https://example.com/')
    expect(req.headers.get('x-header')).toBe('value')
    expect(await res.text()).toBe('OK')
  })

  it('should use headers from the base options', async () => {
    const ffetch = createFfetch({
      fetch: fetch_,
      headers: {
        'X-Header': 'value',
      },
    })
    const res = await ffetch('https://example.com')

    const req = fetch_.mock.calls[0][0] as Request
    expect(req.url).toBe('https://example.com/')
    expect(req.headers.get('X-Header')).toBe('value')
    expect(await res.text()).toBe('OK')
  })

  it('should merge headers from the base options and the params', async () => {
    const ffetch = createFfetch({
      fetch: fetch_,
      headers: {
        'X-Header': 'value',
        'X-Header-2': 'value2',
      },
    })

    const res = await ffetch('https://example.com', {
      headers: {
        'x-header': 'value3',
        'X-Header-4': 'value4',
      },
    })

    const req = fetch_.mock.calls[0][0] as Request
    expect(req.url).toBe('https://example.com/')
    expect(Object.fromEntries(req.headers.entries())).toEqual({
      'x-header': 'value, value3', // wtf is this merging, thanks fetch standard
      'x-header-2': 'value2',
      'x-header-4': 'value4',
    })
    expect(await res.text()).toBe('OK')
  })

  it('should merge headers when extending and arrays are provided', async () => {
    const baseFfetch_ = createFfetch({ fetch: fetch_, headers: [['X-Header', 'value']] })
    const ffetch_ = baseFfetch_.extend({ headers: [['X-Header-2', 'value2']] })

    const res = await ffetch_('https://example.com', { headers: [['X-header-3', 'value3']] })

    expect(fetch_).toHaveBeenCalledOnce()
    const req = fetch_.mock.calls[0][0] as Request
    expect(req.url).toBe('https://example.com/')
    expect(Object.fromEntries(req.headers.entries())).toEqual({
      'x-header': 'value',
      'x-header-2': 'value2',
      'x-header-3': 'value3',
    })
    expect(await res.text()).toBe('OK')
  })

  it('should handle baseUrl', async () => {
    const ffetch = createFfetch({
      fetch: fetch_,
      baseUrl: 'https://base.com',
    })

    await ffetch('/path')
    await ffetch('path')
    await ffetch('https://not-base.com')
    await ffetch('/')

    const req = fetch_.mock.calls[0][0] as Request
    expect(req.url).toBe('https://base.com/path')
    const req2 = fetch_.mock.calls[1][0] as Request
    expect(req2.url).toBe('https://base.com/path')
    const req3 = fetch_.mock.calls[2][0] as Request
    expect(req3.url).toBe('https://not-base.com/')
    const req4 = fetch_.mock.calls[3][0] as Request
    expect(req4.url).toBe('https://base.com/')
  })

  it('should handle baseUrl with a path', async () => {
    const ffetch = createFfetch({
      fetch: fetch_,
      baseUrl: 'https://base.com/api',
    })
    const ffetchTrailing = createFfetch({
      fetch: fetch_,
      baseUrl: 'https://base.com/api/',
    })
    await ffetch('/v1/users')
    await ffetch('v1/users')
    await ffetchTrailing('/v1/users')
    await ffetchTrailing('v1/users')

    const req = fetch_.mock.calls[0][0] as Request
    expect(req.url).toBe('https://base.com/api/v1/users')
    const req2 = fetch_.mock.calls[1][0] as Request
    expect(req2.url).toBe('https://base.com/api/v1/users')
    const req3 = fetch_.mock.calls[2][0] as Request
    expect(req3.url).toBe('https://base.com/api/v1/users')
    const req4 = fetch_.mock.calls[3][0] as Request
    expect(req4.url).toBe('https://base.com/api/v1/users')
  })

  it('should prefer baseUrl from params', async () => {
    const ffetch = createFfetch({
      fetch: fetch_,
      baseUrl: 'https://base.com',
    })
    const res = await ffetch('/path', {
      baseUrl: 'https://override.com',
    })

    const req = fetch_.mock.calls[0][0] as Request
    expect(req.url).toBe('https://override.com/path')

    expect(await res.text()).toBe('OK')
  })

  it('.json() should return json', async () => {
    fetch_.mockImplementationOnce(() => Promise.resolve(new Response('{"hello":"world"}')))
    const res = await ffetch('https://example.com').json()

    const req = fetch_.mock.calls[0][0] as Request
    expect(req.url).toBe('https://example.com/')
    expect(req.headers.get('Accept')).toBe('application/json')

    expect(res).toEqual({ hello: 'world' })
  })

  it('.arrayBuffer() should return ArrayBuffer', async () => {
    fetch_.mockImplementationOnce(() => Promise.resolve(new Response('hello')))
    const res = await ffetch('https://example.com').arrayBuffer()

    const req = fetch_.mock.calls[0][0] as Request
    expect(req.url).toBe('https://example.com/')
    expect(req.headers.get('Accept')).toBe('application/octet-stream')

    expect(res).toEqual(new Uint8Array([104, 101, 108, 108, 111]).buffer)
  })

  it('.blob() should return Blob', async () => {
    fetch_.mockImplementationOnce(() => Promise.resolve(new Response('hello')))
    const res = await ffetch('https://example.com').blob()

    const req = fetch_.mock.calls[0][0] as Request
    expect(req.url).toBe('https://example.com/')
    expect(req.headers.get('Accept')).toBe('application/octet-stream')

    expect(res).toBeInstanceOf(Blob)
    expect(await res.text()).toBe('hello')
  })

  it('.stream() should return a ReadableStream', async () => {
    fetch_.mockImplementationOnce(() => Promise.resolve(new Response('hello')))
    const res = await ffetch('https://example.com').stream()

    const req = fetch_.mock.calls[0][0] as Request
    expect(req.url).toBe('https://example.com/')

    expect(res).toBeInstanceOf(ReadableStream)

    const r = res.getReader()
    expect(await r.read()).toEqual({ value: new Uint8Array([104, 101, 108, 108, 111]), done: false })
    expect(await r.read()).toEqual({ value: undefined, done: true })
  })

  it('should call through middlewares', async () => {
    const middleware1 = vi.fn<FfetchMiddleware>((req, next) => next(req))
    const middleware2 = vi.fn<FfetchMiddleware>((req, next) => next(req))
    const ffetch_ = createFfetch({
      fetch: fetch_,
      middlewares: [middleware1, middleware2],
    })

    await ffetch_('https://example.com')

    expect(middleware1).toHaveBeenCalledOnce()
    expect(middleware2).toHaveBeenCalledOnce()
    expect(middleware1).toHaveBeenCalledWith(expect.any(Request), expect.any(Function))
    expect(middleware2).toHaveBeenCalledWith(expect.any(Request), expect.any(Function))
  })

  it('should override request/response via middlewares', async () => {
    const middleware1 = vi.fn<FfetchMiddleware>(async (req, next) => {
      req.headers.set('X-Req-Header', 'value')
      const res = await next(req)
      return new Response(`uwu (orig: ${await res.text()})`, {
        headers: {
          'X-Res-Header': 'value',
        },
      })
    })
    const ffetch_ = createFfetch({ fetch: fetch_, middlewares: [middleware1] })

    const res = await ffetch_('https://example.com')

    expect(fetch_).toHaveBeenCalledOnce()
    const req = fetch_.mock.calls[0][0] as Request
    expect(req.headers.get('X-Req-Header')).toBe('value')
    expect(res.headers.get('X-Res-Header')).toBe('value')
    expect(await res.text()).toBe('uwu (orig: OK)')
  })

  it('should override url/options with addons', async () => {
    const addon: FfetchAddon<object, object> = {
      beforeRequest: vi.fn((ctx) => {
        ctx.url = 'https://example2.com'
        ctx.options.method = 'POST'
      }),
    }

    const ffetch_ = createFfetch({ fetch: fetch_, addons: [addon] })

    await ffetch_('https://example.com')

    expect(addon.beforeRequest).toHaveBeenCalledWith(expect.any(Object))
    expect(fetch_).toHaveBeenCalledOnce()

    const req = fetch_.mock.calls[0][0] as Request
    expect(req.url).toBe('https://example2.com/')
    expect(req.method).toBe('POST')
  })

  it('should throw HttpError on non-2xx responses', async () => {
    fetch_.mockImplementation(async () => new Response('Not OK', { status: 403 }))

    await expect(ffetch('https://example.com')).rejects.toThrow(HttpError)
  })

  it('should not throw if validateResponse is false', async () => {
    fetch_.mockImplementation(async () => new Response('Not OK', { status: 403 }))

    expect(await ffetch('https://example.com', {
      validateResponse: false,
    }).text()).toBe('Not OK')
  })

  it('should not throw if validateResponse is false in createFfetch', async () => {
    fetch_.mockImplementation(async () => new Response('Not OK', { status: 403 }))
    const ffetch = createFfetch({ fetch: fetch_, validateResponse: false })

    expect(await ffetch('https://example.com').text()).toBe('Not OK')
  })

  it('should not throw if validateResponse is a function that returns true', async () => {
    fetch_.mockImplementation(async () => new Response('Not OK', { status: 403 }))

    expect(await ffetch('https://example.com', {
      validateResponse: () => true,
    }).text()).toBe('Not OK')
  })

  it('should throw if validateResponse is a function that returns false', async () => {
    fetch_.mockImplementation(async () => new Response('Not OK', { status: 403 }))

    await expect(ffetch('https://example.com', {
      validateResponse: () => false,
    }).text()).rejects.toThrow(HttpError)
  })

  it('should read the body on error if readBodyOnError is true', async () => {
    fetch_.mockImplementation(async () => new Response('Not OK', { status: 403 }))

    let err: unknown
    try {
      await ffetch('https://example.com', {
        readBodyOnError: true,
      }).text()
    } catch (e) {
      err = e
    }

    expect(err).toBeInstanceOf(HttpError)
    expect((err as HttpError).body).toEqual(new Uint8Array([78, 111, 116, 32, 79, 75]))
    expect((err as HttpError).bodyText).toEqual('Not OK')
  })

  it('should not read the body on error if readBodyOnError is false', async () => {
    fetch_.mockImplementation(async () => new Response('Not OK', { status: 403 }))

    let err: unknown
    try {
      await ffetch('https://example.com', {
        readBodyOnError: false,
      }).text()
    } catch (e) {
      err = e
    }

    expect(err).toBeInstanceOf(HttpError)
    expect((err as HttpError).body).toBeNull()
    expect((err as HttpError).bodyText).toBeNull()
  })

  it('should map errors', async () => {
    fetch_.mockImplementation(async () => new Response('Not OK', { status: 403 }))

    class MyError extends Error {}

    const ffetch = createFfetch({
      fetch: fetch_,
      mapError: (err) => {
        if (err.response.status === 403) return new MyError('403')
        return err
      },
    })

    await expect(ffetch('https://example.com').text()).rejects.toThrow(MyError)
    fetch_.mockImplementation(async () => new Response('Not OK', { status: 404 }))
    await expect(ffetch('https://example.com').text()).rejects.toThrow(HttpError)
  })
})
