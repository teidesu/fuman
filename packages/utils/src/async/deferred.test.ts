import { describe, expect, it } from 'vitest'

import { Deferred, DeferredTracked } from './deferred.js'

describe('Deferred', () => {
  it('should resolve', async () => {
    const deferred = new Deferred<number>()

    deferred.resolve(123)

    expect(await deferred.promise).toBe(123)
  })

  it('should reject', async () => {
    const deferred = new Deferred<number>()

    deferred.reject(new Error('lol'))

    await expect(deferred.promise).rejects.toThrow('lol')
  })
})

describe('DeferredTracked', () => {
  it('should resolve', async () => {
    const deferred = new DeferredTracked<number>()

    deferred.resolve(123)

    expect(await deferred.promise).toBe(123)
  })

  it('should reject', async () => {
    const deferred = new DeferredTracked<number>()

    deferred.reject(new Error('lol'))

    await expect(deferred.promise).rejects.toThrow('lol')
  })

  it('should get result', async () => {
    const deferred = new DeferredTracked<number>()

    deferred.resolve(123)

    expect(deferred.result).toBe(123)
    expect(deferred.error).toBeUndefined()
    expect(deferred.status).toEqual({ type: 'fulfilled', value: 123 })

    await deferred.promise.catch(() => {})
  })

  it('should get error', async () => {
    const deferred = new DeferredTracked<number>()

    const error = new Error('lol')
    deferred.reject(error)

    expect(deferred.error).toBe(error)
    expect(deferred.result).toBeUndefined()
    expect(deferred.status).toEqual({ type: 'rejected', reason: error })

    await deferred.promise.catch(() => {})
  })

  it('should be pending until resolved or rejected', async () => {
    const deferred = new DeferredTracked<number>()

    expect(deferred.status).toEqual({ type: 'pending' })
    expect(deferred.result).toBeUndefined()
    expect(deferred.error).toBeUndefined()

    deferred.resolve(123)

    expect(deferred.status).toEqual({ type: 'fulfilled', value: 123 })
    expect(deferred.result).toBe(123)
    expect(deferred.error).toBeUndefined()

    await deferred.promise.catch(() => {})
  })

  it('should ignore subsequent resolve calls', async () => {
    const deferred = new DeferredTracked<number>()

    deferred.resolve(123)
    deferred.resolve(456)

    expect(deferred.result).toBe(123)

    await deferred.promise.catch(() => {})
  })

  it('should ignore subsequent reject calls', async () => {
    const deferred = new DeferredTracked<number>()

    const error = new Error('lol')

    deferred.reject(error)
    deferred.reject(new Error('wtf'))

    expect(deferred.error).toBe(error)

    await deferred.promise.catch(() => {})
  })

  it('should ignore subsequent other calls', async () => {
    const deferred = new DeferredTracked<number>()

    deferred.resolve(123)
    deferred.reject(new Error('lol'))

    expect(deferred.result).toBe(123)

    await deferred.promise.catch(() => {})
  })
})
