import { describe, expect, it } from 'vitest'

import { ConditionVariable } from './condition-variable.js'

describe('ConditionVariable', () => {
  it('should correctly unlock execution', async () => {
    const cv = new ConditionVariable()

    setTimeout(() => cv.notify(), 10)

    await cv.wait()

    expect(true).toBeTruthy()
  })

  it('should only unlock once', async () => {
    const cv = new ConditionVariable()

    setTimeout(() => {
      cv.notify()
      cv.notify()
    }, 10)

    await cv.wait()

    expect(true).toBeTruthy()
  })

  it('should correctly handle multiple wait() calls', async () => {
    const cv = new ConditionVariable()

    const p1 = cv.wait()
    const p2 = cv.wait()

    setTimeout(() => cv.notify(), 10)

    await p1
    await p2
  })
})
