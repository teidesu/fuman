import { describe, expect, it } from 'vitest'

import { reverse8Bits, reverseBits, reverseBitsAll, reverseBitsBig } from './utils.js'

describe('reverse8Bits', () => {
    it('should reverse bits of a single byte', () => {
        expect(reverse8Bits(0b10101010)).toBe(0b01010101)
        expect(reverse8Bits(0b01010101)).toBe(0b10101010)
        expect(reverse8Bits(0b11110000)).toBe(0b00001111)
        expect(reverse8Bits(0b00001111)).toBe(0b11110000)
    })
})

describe('reverseBits', () => {
    it('should reverse bits of an 8-bit value', () => {
        expect(reverseBits(0b10101010, 8)).toBe(0b01010101)
        expect(reverseBits(0b01010101, 8)).toBe(0b10101010)
        expect(reverseBits(0b11110000, 8)).toBe(0b00001111)
        expect(reverseBits(0b00001111, 8)).toBe(0b11110000)
    })

    it('should reverse bits of a 4-bit value', () => {
        expect(reverseBits(0b1010, 4)).toBe(0b0101)
        expect(reverseBits(0b0101, 4)).toBe(0b1010)
        expect(reverseBits(0b1100, 4)).toBe(0b0011)
        expect(reverseBits(0b0011, 4)).toBe(0b1100)
    })
})

describe('reverseBitsBig', () => {
    it('should reverse bits of a bigint', () => {
        expect(reverseBitsBig(0b10101010n, 8n)).toBe(0b01010101n)
        expect(reverseBitsBig(0b01010101n, 8n)).toBe(0b10101010n)
        expect(reverseBitsBig(0b11110000n, 8n)).toBe(0b00001111n)
        expect(reverseBitsBig(0b00001111n, 8n)).toBe(0b11110000n)
    })

    it('should reverse bits of a 4-bit value', () => {
        expect(reverseBitsBig(0b1010n, 4n)).toBe(0b0101n)
        expect(reverseBitsBig(0b0101n, 4n)).toBe(0b1010n)
        expect(reverseBitsBig(0b1100n, 4n)).toBe(0b0011n)
        expect(reverseBitsBig(0b0011n, 4n)).toBe(0b1100n)
    })
})

describe('reverseBitsAll', () => {
    it('should reverse bits of a byte', () => {
        const buf = new Uint8Array([0b10101010, 0b01010101])
        reverseBitsAll(buf)
        expect(buf).toEqual(new Uint8Array([0b01010101, 0b10101010]))
    })
})
