import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { decode, decodedLength, encode, encodedLength } from './base64.js'

beforeEach(() => {
    vi.stubGlobal('Buffer', undefined)
})
afterEach(() => {
    vi.unstubAllGlobals()
})

describe('base64', () => {
    describe('encode', () => {
        it('should encode to base64', () => {
            expect(encode(new Uint8Array([1, 2, 3]))).toBe('AQID')
        })

        it('should handle padding', () => {
            expect(encode(new Uint8Array([1, 2, 3, 4]))).toBe('AQIDBA==')
        })

        it('should use standard alphabet by default', () => {
            expect(encode(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 255]))).toBe('AQIDBAUGBwgJCgsMDQ4PEBESExT/')
        })

        it('should use url-safe alphabet if requested', () => {
            expect(encode(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 255]), true)).toBe('AQIDBAUGBwgJCgsMDQ4PEBESExT_')
        })
    })

    describe('decode', () => {
        it('should decode from base64', () => {
            expect(decode('AQID')).toEqual(new Uint8Array([1, 2, 3]))
        })

        it('should handle padding', () => {
            expect(decode('AQIDBA==')).toEqual(new Uint8Array([1, 2, 3, 4]))
        })

        it('should handle standard alphabet', () => {
            expect(decode('AQIDBAUGBwgJCgsMDQ4PEBESExT/')).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 255]))
        })

        it('should handle url-safe alphabet', () => {
            expect(decode('AQIDBAUGBwgJCgsMDQ4PEBESExT_', true)).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 255]))
        })
    })

    describe('encodedLength', () => {
        it('should return the length of a resulting string', () => {
            expect(encodedLength(1)).toBe(4)
            expect(encodedLength(2)).toBe(4)
            expect(encodedLength(3)).toBe(4)
            expect(encodedLength(4)).toBe(8)
            expect(encodedLength(5)).toBe(8)
            expect(encodedLength(100)).toBe(136)
        })
    })

    describe('decodedLength', () => {
        it('should return the maximum length of a resulting buffer', () => {
            expect(decodedLength(4)).toBe(3)
            expect(decodedLength(8)).toBe(6)
            expect(decodedLength(136)).toBe(102)
        })
    })

    it('should handle huge buffers', () => {
        const buf = new Uint8Array(1024 * 512)
        buf.fill(1)

        const encoded = encode(buf)
        const decoded = decode(encoded)

        expect(decoded).toEqual(buf)
    })
})
