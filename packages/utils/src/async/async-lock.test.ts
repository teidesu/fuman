import { describe, expect, it } from 'vitest'

import { AsyncLock } from './async-lock.js'
import { sleep } from './sleep.js'

describe('AsyncLock', () => {
  it('should correctly lock execution', async () => {
    const lock = new AsyncLock()

    const log: number[] = []
    await Promise.all(
      Array.from({ length: 10 }, (_, idx) =>
        lock.with(async () => {
          await sleep(10 - idx)
          log.push(idx)
        })),
    )

    expect(log).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('should grant the lock in fifo order', async () => {
    const lock = new AsyncLock()
    const log: string[] = []

    await lock.acquire()
    const a = lock.acquire().then(() => {
      log.push('a')
      lock.release()
    })
    await Promise.resolve()

    lock.release()
    const b = lock.acquire().then(() => {
      log.push('b')
      lock.release()
    })

    await Promise.all([a, b])
    expect(log).toEqual(['a', 'b'])
  })

  it('should throw when releasing an unlocked lock', () => {
    const lock = new AsyncLock()
    expect(() => lock.release()).toThrow('Nothing to release')
  })

  it('should correctly propagate errors', async () => {
    const lock = new AsyncLock()

    await expect(async () => {
      await lock.with(() => {
        throw new Error('test')
      })
    }).rejects.toThrow('test')
  })
})
