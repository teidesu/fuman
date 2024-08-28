import { describe, expect, it } from 'vitest'

import { hex, utf8 } from '../../encodings/index.js'

import { xor, xorInPlace } from './xor.js'

describe('xor', () => {
    it('should xor buffers without modifying original', () => {
        const data = utf8.encoder.encode('hello')
        const key = utf8.encoder.encode('xor')

        const xored = xor(data, key)
        expect(utf8.decoder.decode(data)).eq('hello')
        expect(utf8.decoder.decode(key)).eq('xor')
        expect(hex.encode(xored)).eq('100a1e6c6f')
    })

    it('should be deterministic', () => {
        const data = utf8.encoder.encode('hello')
        const key = utf8.encoder.encode('xor')

        const xored1 = xor(data, key)
        expect(hex.encode(xored1)).eq('100a1e6c6f')

        const xored2 = xor(data, key)
        expect(hex.encode(xored2)).eq('100a1e6c6f')
    })

    it('second call should decode content', () => {
        const data = utf8.encoder.encode('hello')
        const key = utf8.encoder.encode('xor')

        const xored1 = xor(data, key)
        expect(hex.encode(xored1)).eq('100a1e6c6f')

        const xored2 = xor(xored1, key)
        expect(utf8.decoder.decode(xored2)).eq('hello')
    })
})

describe('xorInPlace', () => {
    it('should xor buffers by modifying original', () => {
        const data = utf8.encoder.encode('hello')
        const key = utf8.encoder.encode('xor')

        xorInPlace(data, key)
        expect(hex.encode(data)).eq('100a1e6c6f')
        expect(utf8.decoder.decode(key)).eq('xor')
    })

    it('second call should decode content', () => {
        const data = utf8.encoder.encode('hello')
        const key = utf8.encoder.encode('xor')

        xorInPlace(data, key)
        expect(hex.encode(data)).eq('100a1e6c6f')

        xorInPlace(data, key)
        expect(utf8.decoder.decode(data)).eq('hello')
    })
})
