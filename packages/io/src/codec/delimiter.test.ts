import { describe, expect, it } from 'vitest'

import { Bytes } from '../bytes.js'

import { DelimiterCodec } from './delimiter.js'
import { FramedReader } from './reader.js'
import { FramedWriter } from './writer.js'

describe('DelimiterCodec', () => {
    it('should frame by delimiter', async () => {
        const codec = new DelimiterCodec(new Uint8Array([10]))
        const buf = new Uint8Array([1, 2, 3, 10, 4, 5, 6])
        const readable = Bytes.from(buf)

        const reader = new FramedReader(readable, codec)

        expect(await reader.read()).toEqual(new Uint8Array([1, 2, 3]))
        expect(await reader.read()).toEqual(new Uint8Array([4, 5, 6]))
        expect(await reader.read()).toBeNull()
    })

    it('should keep the delimiter if asked to', async () => {
        const codec = new DelimiterCodec(new Uint8Array([10]), { strategy: 'keep' })
        const buf = new Uint8Array([1, 2, 3, 10, 4, 5, 6])
        const readable = Bytes.from(buf)

        const reader = new FramedReader(readable, codec)

        expect(await reader.read()).toEqual(new Uint8Array([1, 2, 3, 10]))
        expect(await reader.read()).toEqual(new Uint8Array([4, 5, 6]))
        expect(await reader.read()).toBeNull()
    })

    it('should ignore empty trailing frame', async () => {
        const codec = new DelimiterCodec(new Uint8Array([10]), { strategy: 'keep' })
        const buf = new Uint8Array([1, 2, 3, 10, 4, 5, 6, 10])
        const readable = Bytes.from(buf)

        const reader = new FramedReader(readable, codec)

        expect(await reader.read()).toEqual(new Uint8Array([1, 2, 3, 10]))
        expect(await reader.read()).toEqual(new Uint8Array([4, 5, 6, 10]))
        expect(await reader.read()).toBeNull()
    })

    it('should work as an iterator', async () => {
        const codec = new DelimiterCodec(new Uint8Array([10]))
        const buf = new Uint8Array([1, 2, 3, 10, 4, 5, 6, 10])
        const readable = Bytes.from(buf)

        const reader = new FramedReader(readable, codec)

        const frames = []
        for await (const frame of reader) {
            frames.push(frame)
        }

        expect(frames).toEqual([
            new Uint8Array([1, 2, 3]),
            new Uint8Array([4, 5, 6]),
        ])
    })

    it('should write frames', async () => {
        const into = Bytes.alloc()
        const codec = new DelimiterCodec(new Uint8Array([10]))
        const writer = new FramedWriter(into, codec)

        await writer.write(new Uint8Array([1, 2, 3]))
        await writer.write(new Uint8Array([4, 5, 6]))

        expect(into.result()).toEqual(new Uint8Array([1, 2, 3, 10, 4, 5, 6, 10]))
    })
})
