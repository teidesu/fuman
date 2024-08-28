import { describe, expect, it } from 'vitest'

import * as u8 from './swap.js'

describe('swap', () => {
    describe('swap16', () => {
        it('should swap by 16 bits in-place', () => {
            const buffer = new Uint8Array([0x12, 0x34, 0x56, 0x78])
            u8.swap16(buffer)
            expect(buffer).toEqual(new Uint8Array([0x34, 0x12, 0x78, 0x56]))
        })

        it('should throw when buffer length is not a multiple of 2', () => {
            expect(() => u8.swap16(new Uint8Array([0x12, 0x34, 0x56]))).toThrow(RangeError)
        })
    })

    describe('swap32', () => {
        it('should swap by 32 bits in-place', () => {
            const buffer = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0])
            u8.swap32(buffer)
            expect(buffer).toEqual(new Uint8Array([0x78, 0x56, 0x34, 0x12, 0xF0, 0xDE, 0xBC, 0x9A]))
        })

        it('should throw when buffer length is not a multiple of 4', () => {
            expect(() => u8.swap32(new Uint8Array([0x12, 0x34, 0x56]))).toThrow(RangeError)
        })
    })

    describe('swap64', () => {
        it('should swap by 64 bits in-place', () => {
            const buffer = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88])
            u8.swap64(buffer)
            expect(buffer).toEqual(new Uint8Array([0xF0, 0xDE, 0xBC, 0x9A, 0x78, 0x56, 0x34, 0x12, 0x88, 0x77, 0x66, 0x55, 0x44, 0x33, 0x22, 0x11]))
        })

        it('should throw when buffer length is not a multiple of 8', () => {
            expect(() => u8.swap64(new Uint8Array([0x12, 0x34, 0x56]))).toThrow(RangeError)
        })
    })

    describe('swapNibbles', () => {
        it('should swap half-bytes in-place', () => {
            const buffer = new Uint8Array([0x12, 0x34, 0x56, 0x78])
            u8.swapNibbles(buffer)
            expect(buffer).toEqual(new Uint8Array([0x21, 0x43, 0x65, 0x87]))
        })
    })
})
