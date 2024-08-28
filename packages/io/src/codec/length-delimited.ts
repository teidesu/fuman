import type { Bytes } from '../bytes.js'
import type { ISyncWritable } from '../types.js'
import type { IFrameDecoder, IFrameEncoder } from './types.js'
import { u8 } from '@fuman/utils'

export interface LengthDelimitedCodecOptions {
    read?: (r: Bytes) => number | null
    write?: (w: ISyncWritable, n: number) => void
}

export class LengthDelimitedCodec implements IFrameDecoder, IFrameEncoder {
    #read: LengthDelimitedCodecOptions['read']
    #write: LengthDelimitedCodecOptions['write']

    constructor(options: LengthDelimitedCodecOptions) {
        this.#read = options.read
        this.#write = options.write
    }

    #pendingLength: number | null = null
    decode(buf: Bytes): Uint8Array | null {
        if (!this.#read) {
            throw new Error('LengthDelimitedCodec: read function not provided')
        }

        if (this.#pendingLength !== null) {
            const pendingLength = this.#pendingLength

            if (buf.available < pendingLength) {
                return null
            }

            const data = buf.readSync(pendingLength)
            this.#pendingLength = null
            // we need to copy the data because the underlying buffer will get invalidated
            return u8.allocWith(data)
        }

        const length = this.#read(buf)
        if (length === null) return null

        this.#pendingLength = length
        return this.decode(buf)
    }

    encode(frame: Uint8Array, into: ISyncWritable): void {
        if (!this.#write) {
            throw new Error('LengthDelimitedCodec: write function not provided')
        }

        this.#write(into, frame.length)
        into.writeSync(frame.length).set(frame)
        into.disposeWriteSync()
    }

    reset(): void {
        this.#pendingLength = null
    }
}
