import { describe, expect, it } from 'vitest'

import { clone, empty, readNthBit } from './misc.js'

describe('empty', () => {
  it('should be an empty buffer', () => {
    expect(empty).toEqual(new Uint8Array(0))
  })
})

describe('clone', () => {
  it('should clone a buffer', () => {
    const buf = new Uint8Array([1, 2, 3])
    const copy = clone(buf)

    expect(copy).not.toBe(buf)
    expect(copy).toEqual(buf)
  })
})

describe('readNthBit', () => {
  it('should read nth bit', () => {
    expect(readNthBit(0b10101010, 0)).toBe(0)
    expect(readNthBit(0b10101010, 1)).toBe(1)
    expect(readNthBit(0b10101010, 2)).toBe(0)
    expect(readNthBit(0b10101010, 3)).toBe(1)
    expect(readNthBit(0b10101010, 4)).toBe(0)
    expect(readNthBit(0b10101010, 5)).toBe(1)
    expect(readNthBit(0b10101010, 6)).toBe(0)
    expect(readNthBit(0b10101010, 7)).toBe(1)
  })
})
