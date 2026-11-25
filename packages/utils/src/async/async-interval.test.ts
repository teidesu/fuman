import { describe, expect, it } from 'vitest'

import { AsyncInterval } from './async-interval.js'

describe('AsyncInterval', () => {
  it('should not start a second loop when start() runs mid-tick', async () => {
    let count = 0
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const interval = new AsyncInterval(async () => {
      count++
      if (count === 1) await gate
    }, 1000)

    interval.startNow()
    interval.start()
    expect(count).toBe(1)
    release()
    await new Promise(resolve => setTimeout(resolve, 30))
    interval.stop()

    expect(count).toBe(1)
  })
})
