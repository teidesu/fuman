import { describe, expect, it } from 'vitest'

import { Bytes } from '../bytes.js'

import { BitReader } from './reader.js'

describe('BitReader', () => {
    it('should read in direct order', () => {
        const bytes = Bytes.from(new Uint8Array([0b10101010, 0b10101010]))
        const bits = new BitReader(bytes)

        expect(bits.readBits(1)).toBe(1)
        expect(bits.readBits(1)).toBe(0)
        expect(bits.readBits(2)).toBe(0b10)
        expect(bits.readBits(4)).toBe(0b1010)
        expect(bits.readBits(8)).toBe(0b10101010)
        expect(bits.isAligned).toBe(true)
    })

    it('should handle reads across byte boundary', () => {
        const bytes = Bytes.from(new Uint8Array([0b10101010, 0b10101010]))
        const bits = new BitReader(bytes)

        expect(bits.readBits(3)).toBe(0b101)
        expect(bits.isAligned).toBe(false)
        expect(bits.readBits(3)).toBe(0b010)
        expect(bits.isAligned).toBe(false)
        expect(bits.readBits(3)).toBe(0b101)
        expect(bits.isAligned).toBe(false)
        expect(bits.readBits(7)).toBe(0b0101010)
        expect(bits.isAligned).toBe(true)
    })

    it('should handle large unaligned reads', () => {
        const bytes = Bytes.from(new Uint8Array([0, 1, 1]))
        const bits = new BitReader(bytes)

        bits.readBits(1)
        expect(bits.readBits(23)).toBe(0b100000001)
        expect(bits.isAligned).toBe(true)
    })

    it('should implement SyncReadable when aligned', () => {
        const bytes = Bytes.from(new Uint8Array([0b10101010, 0b10101010]))
        const bits = new BitReader(bytes)

        expect(bits.readSync(1)).toEqual(new Uint8Array([0b10101010]))
        expect(bits.readSync(1)).toEqual(new Uint8Array([0b10101010]))
    })

    it('should implement SyncReadable when unaligned', () => {
        const bytes = Bytes.from(new Uint8Array([
            0b10101010,
            0b10101110,
            0b10000000,
        ]))
        const bits = new BitReader(bytes)

        bits.readBits(1) // 0b1
        expect(bits.readSync(2)).toEqual(new Uint8Array([0b01010101, 0b01011101]))
        bits.readBits(7) // 0b0000000
        expect(bits.isAligned).toBe(true)
    })

    it('should handle bigints', () => {
        const bytes = Bytes.from(new Uint8Array([
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
        ]))
        const bits = new BitReader(bytes)

        bits.readBits(1)

        expect(bits.readBitsBig(64)).toBe(
            0b1000000100000001100000100000001010000011000000111000010000n,
        )
    })

    describe('skipBits', () => {
        it('should correctly skip bits when aligned', () => {
            const bytes = Bytes.from(new Uint8Array([
                0b10101010,
                0b10101010,
                0b11111111,
            ]))
            const bits = new BitReader(bytes)

            bits.skipBits(17)
            expect(bits.readBits(7)).toBe(0b1111111)
            expect(bits.isAligned).toBe(true)
        })

        it('should correctly skip bits when not aligned', () => {
            const bytes = Bytes.from(new Uint8Array([
                0b10101010,
                0b10101010,
                0b11111111,
            ]))
            const bits = new BitReader(bytes)

            bits.readBits(2)
            bits.skipBits(17)
            expect(bits.readBits(5)).toBe(0b11111)
            expect(bits.isAligned).toBe(true)
        })

        it('should correctly skip bytes', () => {
            const bytes = Bytes.from(new Uint8Array([
                0b10101010,
                0b10101010,
                0b11111111,
            ]))
            const bits = new BitReader(bytes)

            bits.readBits(2)
            bits.skipBits(16)
            expect(bits.readBits(6)).toBe(0b111111)
            expect(bits.isAligned).toBe(true)
        })
    })

    it('.align() should align', () => {
        const bytes = Bytes.from(new Uint8Array([0b10101010, 0b10101010]))
        const bits = new BitReader(bytes)

        bits.readBits(2)
        bits.align()

        expect(bits.readBits(3)).toBe(0b101)
    })

    it('.bitPosition should return the bit position', () => {
        const bytes = Bytes.from(new Uint8Array([0b10101010, 0b10101010]))
        const bits = new BitReader(bytes)

        bits.readBits(2)
        expect(bits.bitPosition).toBe(2)
        bits.readBits(3)
        expect(bits.bitPosition).toBe(5)
        bits.align()
        expect(bits.bitPosition).toBe(0)
    })
})
