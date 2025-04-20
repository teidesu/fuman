import { describe, expect, it } from 'vitest'

import { includes, includesArray, indexOf, indexOfArray, lastIndexOf, lastIndexOfArray } from './find.js'

describe('indexOf', () => {
  it('should find the index of a value', () => {
    const haystack = new Uint8Array([1, 2, 3, 4, 3, 4, 5])
    const needle = 3

    expect(indexOf(haystack, needle)).toBe(2)
  })

  it('should return -1 if not found', () => {
    const haystack = new Uint8Array([1, 2, 3, 4, 5])
    const needle = 6

    expect(indexOf(haystack, needle)).toBe(-1)
  })
})

describe('lastIndexOf', () => {
  it('should find the last index of a value', () => {
    const haystack = new Uint8Array([1, 2, 3, 4, 3, 4, 5])
    const needle = 3

    expect(lastIndexOf(haystack, needle)).toBe(4)
  })

  it('should return -1 if not found', () => {
    const haystack = new Uint8Array([1, 2, 3, 4, 5])
    const needle = 6

    expect(lastIndexOf(haystack, needle)).toBe(-1)
  })
})

describe('indexOfArray', () => {
  it('should find the index of an array', () => {
    const haystack = new Uint8Array([1, 2, 3, 4, 3, 4, 5])
    const needle = new Uint8Array([3, 4])

    expect(indexOfArray(haystack, needle)).toBe(2)
  })

  it('should return -1 if not found', () => {
    const haystack = new Uint8Array([1, 2, 3, 4, 5])
    const needle = new Uint8Array([6, 7])

    expect(indexOfArray(haystack, needle)).toBe(-1)
  })
})

describe('lastIndexOfArray', () => {
  it('should find the last index of an array', () => {
    const haystack = new Uint8Array([1, 2, 3, 4, 3, 4, 5])
    const needle = new Uint8Array([3, 4])

    expect(lastIndexOfArray(haystack, needle)).toBe(4)
  })

  it('should return -1 if not found', () => {
    const haystack = new Uint8Array([1, 2, 3, 4, 5])
    const needle = new Uint8Array([6, 7])

    expect(lastIndexOfArray(haystack, needle)).toBe(-1)
  })
})

describe('includes', () => {
  it('should check if a value is in the buffer', () => {
    const haystack = new Uint8Array([1, 2, 3, 4, 5])
    const needle = 3

    expect(includes(haystack, needle)).toBe(true)
  })

  it('should return false if not found', () => {
    const haystack = new Uint8Array([1, 2, 3, 4, 5])
    const needle = 6

    expect(includes(haystack, needle)).toBe(false)
  })
})

describe('includesArray', () => {
  it('should check if an array is in the buffer', () => {
    const haystack = new Uint8Array([1, 2, 3, 4, 5])
    const needle = new Uint8Array([3, 4])

    expect(includesArray(haystack, needle)).toBe(true)
  })

  it('should return false if not found', () => {
    const haystack = new Uint8Array([1, 2, 3, 4, 5])
    const needle = new Uint8Array([6, 7])

    expect(includesArray(haystack, needle)).toBe(false)
  })
})
