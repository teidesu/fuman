import { describe, expect, it } from 'vitest'

import { concat, concat2, concat3 } from './concat.js'

describe('concat', () => {
    it('should concatenate buffers', () => {
        const a = new Uint8Array([1, 2, 3])
        const b = new Uint8Array([4, 5, 6])
        const c = new Uint8Array([7, 8, 9])

        expect(concat([a, b, c])).eql(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]))
    })
})

describe('concat2', () => {
    it('should concatenate 2 buffers', () => {
        const a = new Uint8Array([1, 2, 3])
        const b = new Uint8Array([4, 5, 6])

        expect(concat2(a, b)).eql(new Uint8Array([1, 2, 3, 4, 5, 6]))
    })
})

describe('concat3', () => {
    it('should concatenate 3 buffers', () => {
        const a = new Uint8Array([1, 2, 3])
        const b = new Uint8Array([4, 5, 6])
        const c = new Uint8Array([7, 8, 9])

        expect(concat3(a, b, c)).eql(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]))
    })
})
