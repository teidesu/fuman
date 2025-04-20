import { describe, expect, it } from 'vitest'

import { reverse, toReversed } from './reverse.js'

describe('reverse', () => {
  it('should reverse a buffer in-place', () => {
    const buf = new Uint8Array([1, 2, 3, 4, 5])
    reverse(buf)

    expect(buf).toEqual(new Uint8Array([5, 4, 3, 2, 1]))
  })
})

describe('toReversed', () => {
  it('should reverse a buffer', () => {
    const buf = new Uint8Array([1, 2, 3, 4, 5])
    const reversed = toReversed(buf)

    expect(reversed).toEqual(new Uint8Array([5, 4, 3, 2, 1]))
  })
})
