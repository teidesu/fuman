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
        // @ts-expect-error  this should throw at type level because `1` is not nullable
        const x: number = asNonNull(1)
        expect(x).toBe(1)
    })

    it('should throw if value is null', () => {
        const z: number | null = null
        expect(() => {
            const _x: number = asNonNull(z)
        }).toThrow('value is null')
    })

    it('should throw if value is undefined', () => {
        const z: number | undefined = undefined
        expect(() => {
            const _x: number = asNonNull(z)
        }).toThrow('value is undefined')
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
