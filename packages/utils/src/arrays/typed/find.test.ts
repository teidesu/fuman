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

  it('should clamp negative start like Array#indexOf', () => {
    const haystack = new Int16Array([5, 6, 7, 8, 9])

    expect(indexOf(haystack, 7, -2)).toBe(-1)
    expect(indexOf(haystack, 8, -2)).toBe(3)
    expect(indexOf(haystack, 5, -100)).toBe(0)
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

  it('should clamp negative start like Array#lastIndexOf', () => {
    const haystack = new Uint32Array([10, 20, 30, 20, 40])

    expect(lastIndexOf(haystack, 20, -2)).toBe(3)
    expect(lastIndexOf(haystack, 20, -3)).toBe(1)
    expect(lastIndexOf(haystack, 20, -100)).toBe(-1)
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

  it('should clamp negative start like Array#indexOf', () => {
    const haystack = new Uint8Array([1, 2, 3, 4, 2, 3])
    const needle = new Uint8Array([2, 3])

    expect(indexOfArray(haystack, needle, -2)).toBe(4)
    expect(indexOfArray(haystack, new Uint8Array([]), -1)).toBe(5)
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

  it('should treat start as the last candidate start index', () => {
    const haystack = new Uint8Array([1, 2, 3, 4, 2, 3])
    const needle = new Uint8Array([2, 3])

    expect(lastIndexOfArray(haystack, needle, 4)).toBe(4)
    expect(lastIndexOfArray(haystack, needle, 3)).toBe(1)
  })

  it('should clamp negative start like Array#lastIndexOf', () => {
    const haystack = new Uint8Array([1, 2, 3])

    expect(lastIndexOfArray(haystack, new Uint8Array([]), -1)).toBe(2)
    expect(lastIndexOfArray(haystack, new Uint8Array([]), -100)).toBe(-1)
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
