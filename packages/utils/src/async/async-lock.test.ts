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

    const first = await lock.acquire()
    const a = lock.acquire().then((guard) => {
      log.push('a')
      guard.release()
    })
    await Promise.resolve()

    first.release()
    const b = lock.acquire().then((guard) => {
      log.push('b')
      guard.release()
    })

    await Promise.all([a, b])
    expect(log).toEqual(['a', 'b'])
  })

  it('should ignore repeated releases of the same guard', async () => {
    const lock = new AsyncLock()
    const log: string[] = []

    const first = await lock.acquire()
    const second = lock.acquire().then((guard) => {
      log.push('second acquired')
      return guard
    })
    const third = lock.acquire().then((guard) => {
      log.push('third acquired')
      guard.release()
    })

    first.release()
    first.release()
    await sleep(0)
    expect(log).toEqual(['second acquired'])

    ;(await second).release()
    await third
    expect(log).toEqual(['second acquired', 'third acquired'])
  })

  it('should release the lock on dispose', async () => {
    const lock = new AsyncLock()

    {
      using _guard = await lock.acquire()
    }

    const guard = await lock.acquire()
    guard.release()
  })

  it('should return the value from with()', async () => {
    const lock = new AsyncLock()

    await expect(lock.with(async () => 42)).resolves.toBe(42)
  })

  it('should correctly propagate errors', async () => {
    const lock = new AsyncLock()

    await expect(async () => {
      await lock.with(() => {
        throw new Error('test')
      })
    }).rejects.toThrow('test')
  })

  it('should propagate nullish errors and release the lock', async () => {
    const lock = new AsyncLock()

    // eslint-disable-next-line prefer-promise-reject-errors
    await expect(lock.with(() => Promise.reject(undefined))).rejects.toBeUndefined()

    const guard = await lock.acquire()
    guard.release()
  })
})
