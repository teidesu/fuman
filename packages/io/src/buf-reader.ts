import type { IReadable } from './types.js'
import { u8 } from '@fuman/utils'

const DEFAULT_BUF_SIZE = 4096
const MIN_BUF_SIZE = 16

export class BufReader implements IReadable {
    #buffer: Uint8Array
    #readable: IReadable
    #readPos = 0
    #writePos = 0
    #eof = false

    constructor(readable: IReadable, size: number = DEFAULT_BUF_SIZE) {
        if (size < MIN_BUF_SIZE) {
            size = MIN_BUF_SIZE
        }
        this.#buffer = u8.alloc(size)
        this.#readable = readable
    }

    /** the size of the buffer */
    get bufferSize(): number {
        return this.#buffer.byteLength
    }

    /** the number of bytes that are currently buffered */
    get buffered(): number {
        return this.#writePos - this.#readPos
    }

    async #fill() {
        // Slide existing data to beginning.
        if (this.#readPos > 0) {
            this.#buffer.copyWithin(0, this.#readPos, this.#writePos)
            this.#writePos -= this.#readPos
            this.#readPos = 0
        }

        if (this.#writePos >= this.#buffer.byteLength) {
            throw new Error('tried to fill full buffer')
        }

        const read = await this.#readable.read(this.#buffer.subarray(this.#writePos))
        if (read === 0) {
            this.#eof = true
            return
        }

        this.#writePos += read
    }

    async read(into: Uint8Array): Promise<number> {
        if (this.#eof) {
            return 0
        }

        if (this.#readPos === this.#writePos) {
            if (into.byteLength >= this.#buffer.byteLength) {
                // Large read, empty buffer. bypass buffer.
                return this.#readable.read(into)
            }

            await this.#fill()
        }

        // return as much as we can
        const sliceSize = Math.min(this.#writePos - this.#readPos, into.byteLength)
        into.set(this.#buffer.subarray(this.#readPos, this.#readPos + sliceSize))
        this.#readPos += sliceSize
        return sliceSize
    }
}
