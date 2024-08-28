import type { IWritable } from '../types.js'

import type { IFrameEncoder } from './types.js'
import { Bytes } from '../bytes.js'

export interface FramedWriterOptions {
    initialBufferSize?: number
}

export class FramedWriter<Frame = Uint8Array> {
    #writable: IWritable
    #encoder: IFrameEncoder<Frame>
    #buffer: Bytes

    #highWaterMark: number

    constructor(
        writable: IWritable,
        encoder: IFrameEncoder<Frame>,
        options?: FramedWriterOptions,
    ) {
        this.#writable = writable
        this.#encoder = encoder

        this.#highWaterMark = options?.initialBufferSize ?? 1024
        this.#buffer = Bytes.alloc(this.#highWaterMark)
    }

    async write(frame: Frame): Promise<void> {
        await this.#encoder.encode(frame, this.#buffer)

        const buffer = this.#buffer.result()

        if (buffer.length > 0) {
            this.#buffer.reset()
            await this.#writable.write(buffer)
        }
    }
}
