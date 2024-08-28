import { describe, expect, it } from 'vitest'

import { asNonNull, assertMatches, assertNonNull } from './assert.js'

describe('assertNonNull', () => {
    it('should throw if value is null', () => {
        expect(() => assertNonNull(null)).toThrow('value is null')
    })

    it('should throw if value is undefined', () => {
        expect(() => assertNonNull(undefined)).toThrow('value is undefined')
    })

    it('should not throw if value is not null', () => {
        expect(() => assertNonNull(1)).not.toThrow()
    })
})

describe('asNonNull', () => {
    it('should return the value if it is not null', () => {
        expect(asNonNull(1)).toBe(1)
    })

    it('should throw if value is null', () => {
        expect(() => asNonNull(null)).toThrow('value is null')
    })

    it('should throw if value is undefined', () => {
        expect(() => asNonNull(undefined)).toThrow('value is undefined')
    })
})

describe('assertMatches', () => {
    it('should throw if the string does not match the regex', () => {
        expect(() => assertMatches('hello', /^world$/)).toThrow('"hello" does not match /^world$/')
        expect(() => assertMatches('world', /^hello$/)).toThrow('"world" does not match /^hello$/')
    })

    it('should return the match if the string matches the regex', () => {
        expect(assertMatches('hello', /^hello$/)[0]).toBe('hello')
        expect(assertMatches('world', /^(world)$/)[1]).toBe('world')
    })
})
