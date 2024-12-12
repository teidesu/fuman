import type { IReadable } from './types.js'

/** result of {@link ReaderWithFinal#readWithFinal} */
export interface ReaderWithFinalResult {
    /** number of bytes read */
    readonly nread: number
    /** whether this was the last chunk */
    readonly final: boolean
}

/**
 * a reader that reads one read ahead, allowing the caller to know
 * whether the chunk being read is the last one
 */
export class ReaderWithFinal implements IReadable {
    #buf1: Uint8Array
    #buf2: Uint8Array

    #readable: IReadable
    #prev: Uint8Array | null = null
    #ended = false

    constructor(
        readable: IReadable,
        params?: {
            internalBufferSize?: number
        },
    ) {
        this.#readable = readable
        const bufSize = params?.internalBufferSize ?? 1024 * 32
        this.#buf1 = new Uint8Array(bufSize)
        this.#buf2 = new Uint8Array(bufSize)
    }

    #swapBufs() {
        const tmp = this.#buf1
        this.#buf1 = this.#buf2
        this.#buf2 = tmp
    }

    /** read a chunk of data, and whether it is the last one */
    async readWithFinal(into: Uint8Array): Promise<ReaderWithFinalResult> {
        if (this.#ended) {
            return {
                nread: 0,
                final: true,
            }
        }

        if (!this.#prev) {
            // first read ever, do two reads
            const nread = await this.#readable.read(this.#buf1)

            if (nread === 0) {
                // no data at all, return
                return {
                    nread: 0,
                    final: true,
                }
            }

            this.#prev = this.#buf1.subarray(0, nread)
            this.#swapBufs()
        }

        if (this.#prev.length > into.length) {
            // this.#prev is enough to fill the current request, avoid making another read
            into.set(this.#prev.subarray(0, into.length))
            this.#prev = this.#prev.subarray(into.length)

            return {
                nread: into.length,
                final: false,
            }
        }

        // at this point this.#prev.length is guaranteed to be <= into.length

        const nread = await this.#readable.read(this.#buf1)

        if (nread === 0) {
            // this.#prev was the last chunk, return it with final flag
            into.set(this.#prev)
            this.#ended = true
            return {
                nread: this.#prev.length,
                final: true,
            }
        }

        // there's more data, swap the buffers and continue.

        into.set(this.#prev)
        const nwritten = this.#prev.length
        this.#prev = this.#buf1.subarray(0, nread)
        this.#swapBufs()

        return {
            nread: nwritten,
            final: false,
        }
    }

    async read(into: Uint8Array): Promise<number> {
        const res = await this.readWithFinal(into)
        return res.nread
    }
}
