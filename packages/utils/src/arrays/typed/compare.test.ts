import { describe, expect, it } from 'vitest'

import { compare, equal } from './compare.js'

describe('compare', () => {
    it('should compare buffers', () => {
        const a = new Uint8Array([1, 2, 3])
        const b = new Uint8Array([1, 2, 3])

        expect(compare(a, b)).toBe(0)
    })

    it('should compare buffers with different lengths', () => {
        const a = new Uint8Array([1, 2, 3])
        const b = new Uint8Array([1, 2])

        expect(compare(a, b)).toBe(1)
    })

    it('should compare buffers with different values', () => {
        const a = new Uint8Array([1, 2, 3])
        const b = new Uint8Array([1, 2, 4])

        expect(compare(a, b)).toBe(-1)
    })
})

describe('equal', () => {
    it('should compare buffers', () => {
        const a = new Uint8Array([1, 2, 3])
        const b = new Uint8Array([1, 2, 3])

        expect(equal(a, b)).toBe(true)
    })

    it('should compare buffers with different lengths', () => {
        const a = new Uint8Array([1, 2, 3])
        const b = new Uint8Array([1, 2])

        expect(equal(a, b)).toBe(false)
    })

    it('should compare buffers with different values', () => {
        const a = new Uint8Array([1, 2, 3])
        const b = new Uint8Array([1, 2, 4])
        expect(equal(a, b)).toBe(false)
    })
})
