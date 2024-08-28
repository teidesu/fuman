import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { decode, encode } from './hex.js'

beforeAll(() => {
    vi.stubGlobal('Buffer', undefined)
})
afterAll(() => {
    vi.unstubAllGlobals()
})

describe('hex', () => {
    describe('encode', () => {
        it('should encode to hex', () => {
            expect(encode(new Uint8Array([1, 2, 3]))).toBe('010203')
        })
    })

    describe('decode', () => {
        it('should decode from hex', () => {
            expect(decode('010203')).toEqual(new Uint8Array([1, 2, 3]))
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
