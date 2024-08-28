import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { decoder, encodedLength, encoder } from './utf8.js'

beforeAll(() => {
    vi.stubGlobal('Buffer', undefined)
})
afterAll(() => {
    vi.unstubAllGlobals()
})

describe('utf8', () => {
    describe('encoder', () => {
        it('should encode a string', () => {
            expect(encoder.encode('hello')).toEqual(new Uint8Array([104, 101, 108, 108, 111]))
        })

        it('should encode a string into a buffer', () => {
            const buf = new Uint8Array(5)
            encoder.encodeInto('hello', buf)
            expect(buf).toEqual(new Uint8Array([104, 101, 108, 108, 111]))
        })

        it('should be an instance of TextEncoder', () => {
            expect(encoder).toBeInstanceOf(TextEncoder)
        })
    })

    describe('decoder', () => {
        it('should decode a string', () => {
            expect(decoder.decode(new Uint8Array([104, 101, 108, 108, 111]))).toEqual('hello')
        })

        it('should be an instance of TextDecoder', () => {
            expect(decoder).toBeInstanceOf(TextDecoder)
        })
    })

    describe('encodedLength', () => {
        it('should return the length of a string', () => {
            expect(encodedLength('hello')).toBe(5)
        })

        it('should handle unicode', () => {
            expect(encodedLength('🌸')).toBe(4)
        })
    })
})
