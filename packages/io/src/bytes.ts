import type { IReadable, ISyncReadable, ISyncWritable, IWritable } from './types.js'
import { u8 } from '@fuman/utils'

import { nextPowerOfTwo } from './_utils.js'

/** a byte buffer implementing fuman readable/writable streams */
export class Bytes implements IReadable, IWritable, ISyncReadable, ISyncWritable {
    #buffer: Uint8Array
    #writePos = 0
    #readPos = 0

    #preferredCapacity: number

    constructor(buf: Uint8Array) {
        this.#buffer = buf
        this.#preferredCapacity = buf.length
    }

    static alloc(capacity: number = 1024 * 16): Bytes {
        const bytes = new Bytes(u8.alloc(capacity))
        return bytes
    }

    static from(data: Uint8Array): Bytes {
        const bytes = new Bytes(data)
        bytes.#writePos = data.length
        return bytes
    }

    /** Total number of bytes in the underlying buffer */
    get capacity(): number {
        return this.#buffer.byteLength
    }

    /** Number of bytes available to be read */
    get available(): number {
        return this.#writePos - this.#readPos
    }

    /** Number of bytes written */
    get written(): number {
        return this.#writePos
    }

    #sharedRead = new Uint8Array(1)
    readSync(bytes: number): Uint8Array {
        if (this.#readPos >= this.#writePos) {
            return u8.empty
        }

        if (bytes === 1) {
            // one-byte reads might be common, optimize for that
            this.#sharedRead[0] = this.#buffer[this.#readPos++]
            return this.#sharedRead
        }

        const end = Math.min(this.#writePos, this.#readPos + bytes)

        const result = this.#buffer.subarray(this.#readPos, end)
        this.#readPos = end
        return result
    }

    async read(into: Uint8Array): Promise<number> {
        const size = Math.min(into.length, this.#writePos - this.#readPos)
        into.set(this.#buffer.subarray(this.#readPos, this.#readPos + size))
        this.#readPos += size
        return size
    }

    #lastWriteSize = 0
    writeSync(size: number): Uint8Array {
        this.#lastWriteSize = size

        const newPos = this.#writePos + size
        if (newPos > this.#buffer.length) {
            const newBuffer = u8.alloc(nextPowerOfTwo(newPos))
            newBuffer.set(this.#buffer)
            this.#buffer = newBuffer
        }

        const slice = this.#buffer.subarray(this.#writePos, newPos)
        this.#writePos = newPos
        return slice
    }

    disposeWriteSync(written?: number): void {
        if (written !== undefined) {
            if (written > this.#lastWriteSize) {
                throw new RangeError(`written exceeds last write size: ${written} > ${this.#lastWriteSize}`)
            }
            this.#writePos -= this.#lastWriteSize - written
        }
    }

    async write(bytes: Uint8Array): Promise<void> {
        this.writeSync(bytes.length).set(bytes)
        this.disposeWriteSync()
    }

    /**
     * get the "result" of the buffer, i.e. everything that has been written so far,
     * but not yet read
     *
     * **Note**: this method returns a view into the underlying buffer, and does advance the read cursor
     */
    result(): Uint8Array {
        return this.#buffer.subarray(this.#readPos, this.#writePos)
    }

    /** Reclaim memory by only keeping the yet-unread data */
    reclaim(): void {
        if (this.#readPos === 0) return

        const remaining = this.#writePos - this.#readPos
        if (remaining > 0) {
            if (remaining < this.#preferredCapacity && this.capacity > this.#preferredCapacity) {
                // if the remaining data is smaller than the preferred capacity,
                // we can shrink the buffer to reduce memory usage
                const newBuffer = u8.alloc(this.#preferredCapacity)
                newBuffer.set(this.#buffer.subarray(this.#readPos, this.#writePos))
                this.#buffer = newBuffer
            } else {
                this.#buffer.copyWithin(0, this.#readPos, this.#writePos)
            }
        }
        this.#writePos = remaining
        this.#readPos = 0
    }

    /** Mark last n bytes as unread */
    rewind(n: number): void {
        if (n > this.#readPos) {
            throw new RangeError(`rewind: ${n} > ${this.#readPos}`)
        }
        this.#readPos -= n
    }

    /** reset the read/write cursors */
    reset(): void {
        this.#readPos = 0
        this.#writePos = 0
    }
}
