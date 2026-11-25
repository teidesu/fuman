import { describe, expect, it } from 'vitest'

import { clearUndefined, deepMerge, objectEntries, objectKeys } from './objects.js'

describe('objectKeys', () => {
  it('should return the keys of an object', () => {
    expect(objectKeys({ a: 1, b: 2, c: 3 })).toEqual(['a', 'b', 'c'])
  })
})

describe('objectEntries', () => {
  it('should return the entries of an object', () => {
    expect(objectEntries({ a: 1, b: 2, c: 3 })).toEqual([['a', 1], ['b', 2], ['c', 3]])
  })
})

describe('clearUndefined', () => {
  it('should remove undefined fields from an object', () => {
    const obj = { a: 1, b: undefined, c: 3 }
    clearUndefined(obj)
    expect(obj).toEqual({ a: 1, c: 3 })
  })
})

describe('deepMerge', () => {
  it('should treat Date, Map, Set, and RegExp as leaves', () => {
    const date = new Date('2020-01-01T00:00:00.000Z')
    const map = new Map([['a', 1]])
    const set = new Set([1, 2])
    const re = /ab/g
    const result = deepMerge({} as Record<string, unknown>, { date, map, set, re })

    expect(result.date).toBeInstanceOf(Date)
    expect((result.date as Date).getTime()).toBe(date.getTime())
    expect(result.map).toBeInstanceOf(Map)
    expect([...(result.map as Map<string, number>)]).toEqual([['a', 1]])
    expect(result.set).toBeInstanceOf(Set)
    expect([...(result.set as Set<number>)]).toEqual([1, 2])
    expect(result.re).toBeInstanceOf(RegExp)
    expect((result.re as RegExp).source).toBe('ab')
  })

  it('should replace a nested object with a Date', () => {
    const date = new Date('2020-01-01T00:00:00.000Z')
    const result = deepMerge({ a: { x: 1 } } as Record<string, unknown>, { a: date })

    expect(result.a).toBe(date)
  })

  it('should replace a Date with a later Date', () => {
    const date1 = new Date('2020-01-01T00:00:00.000Z')
    const date2 = new Date('2021-01-01T00:00:00.000Z')
    const result = deepMerge({ a: date1 } as Record<string, unknown>, { a: date2 })

    expect(result.a).toBe(date2)
  })
})
