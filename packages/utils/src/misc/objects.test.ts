import { describe, expect, it } from 'vitest'

import { clearUndefined, objectEntries, objectKeys } from './objects.js'

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
