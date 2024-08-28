import { utf8 } from '@fuman/utils'
import { describe, expect, it } from 'vitest'

import { Bytes } from '../bytes.js'
import * as read from '../read/index.js'
import * as write from '../write/index.js'

import { LengthDelimitedCodec } from './length-delimited.js'
import { FramedReader } from './reader.js'
import { FramedWriter } from './writer.js'

describe('LengthDelimitedCodec', () => {
    const maybeRead32 = (r: Bytes) => r.available > 4 ? read.uint32be(r) : null

    it('should frame by length', async () => {
        const codec = new LengthDelimitedCodec({
            read: maybeRead32,
        })
        const buf = new Uint8Array([0, 0, 0, 3, 1, 2, 3, 0, 0, 0, 3, 4, 5, 6])
        const readable = Bytes.from(buf)

        const reader = new FramedReader(readable, codec)

        expect(await reader.read()).toEqual(new Uint8Array([1, 2, 3]))
        expect(await reader.read()).toEqual(new Uint8Array([4, 5, 6]))
        expect(await reader.read()).toBeNull()
    })

    it('should handle incomplete frames', async () => {
        const codec = new LengthDelimitedCodec({
            read: maybeRead32,
        })
        const buf = Bytes.from(new Uint8Array([0, 0, 0, 6, 1, 2, 3]))

        const reader = new FramedReader(buf, codec)

        expect(await reader.read()).toBeNull()
    })

    it('should handle incomplete length', async () => {
        const codec = new LengthDelimitedCodec({
            read: maybeRead32,
        })
        const buf = Bytes.from(new Uint8Array([0, 0, 0]))

        const reader = new FramedReader(buf, codec)

        expect(await reader.read()).toBeNull()
    })

    it('should encode with delimiter', async () => {
        const codec = new LengthDelimitedCodec({
            write: write.uint16be,
        })
        const buf = Bytes.alloc()
        const writer = new FramedWriter(buf, codec)

        await writer.write(utf8.encoder.encode('Hello'))
        await writer.write(utf8.encoder.encode('World'))

        expect(utf8.decoder.decode(buf.result())).toEqual('\x00\x05Hello\x00\x05World')
    })

    it('.encode() should throw if no write function is provided', async () => {
        const codec = new LengthDelimitedCodec({
            write: undefined,
        })
        const buf = Bytes.alloc()
        const writer = new FramedWriter(buf, codec)

        await expect(() => writer.write(new Uint8Array([1, 2, 3]))).rejects.toThrow(Error)
    })

    it('.decode() should throw if no read function is provided', async () => {
        const codec = new LengthDelimitedCodec({
            read: undefined,
        })
        const buf = Bytes.from(new Uint8Array([0, 0, 0, 3, 1, 2, 3]))
        const reader = new FramedReader(buf, codec)

        await expect(() => reader.read()).rejects.toThrow(Error)
    })
})
