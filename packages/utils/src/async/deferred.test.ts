import { describe, expect, it } from 'vitest'

import { Deferred } from './deferred.js'

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

  it('should resolve with value', async () => {
    const deferred = new Deferred<number>()

    deferred.resolve(123)

    expect(await deferred.promise).toBe(123)
  })

  it('should reject with value', async () => {
    const deferred = new Deferred<number>()

    deferred.reject(new Error('lol'))

    await expect(deferred.promise).rejects.toThrow('lol')
  })
})
