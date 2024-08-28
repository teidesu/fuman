import type { IReadable } from './types.js'
import { describe, expect, it } from 'vitest'

import { BufReader } from './buf-reader.js'
import * as read from './read/index.js'

class InfiniteReader implements IReadable {
    constructor(readonly data: Uint8Array) {}
    pos = 0

    readsLogged = 0

    async read(into: Uint8Array): Promise<number> {
        this.readsLogged++

        const remaining = this.data.length - this.pos
        const sliceSize = Math.min(remaining, into.length)
        into.set(this.data.subarray(this.pos, this.pos + sliceSize))
        this.pos += sliceSize
        if (this.pos === this.data.length) {
            this.pos = 0
        }

        return sliceSize
    }
}

const DATA_1K = new Uint8Array(1024)
for (let i = 0; i < DATA_1K.length; i++) {
    DATA_1K[i] = (Math.ceil(Math.random() * 256)) & 0xFF
}

describe('BufReader', () => {
    it('should buffer reads', async () => {
        const reader = new InfiniteReader(DATA_1K)
        const bufReader = new BufReader(reader, 512)

        expect(reader.readsLogged).toBe(0)

        const buf1 = new Uint8Array(256)
        const read1 = await bufReader.read(buf1)
        // first read, buffer is empty
        expect(reader.readsLogged).toBe(1)
        expect(read1).toBe(256)

        const buf2 = new Uint8Array(128)
        const read2 = await bufReader.read(buf2)
        // there's still data in the buffer
        expect(reader.readsLogged).toBe(1)
        expect(read2).toBe(128)

        const buf3 = new Uint8Array(256)
        const read3 = await bufReader.read(buf3)
        // exhausted, but not refilled yet
        expect(reader.readsLogged).toBe(1)
        expect(read3).toBe(128)

        const buf4 = new Uint8Array(256)
        const read4 = await bufReader.read(buf4)
        // refilled
        expect(reader.readsLogged).toBe(2)
        expect(read4).toBe(256)
    })

    it('should read in correct order', async () => {
        const reader = new InfiniteReader(DATA_1K)
        const bufReader = new BufReader(reader, 32)

        expect(await read.async.exactly(bufReader, 100)).toEqual(DATA_1K.subarray(0, 100))
        expect(await read.async.exactly(bufReader, 100)).toEqual(DATA_1K.subarray(100, 200))
        expect(await read.async.exactly(bufReader, 100)).toEqual(DATA_1K.subarray(200, 300))
    })
})
