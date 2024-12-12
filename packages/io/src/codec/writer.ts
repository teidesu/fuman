import type { IWritable } from '../types.js'

import type { IFrameEncoder } from './types.js'
import { Bytes } from '../bytes.js'

/** options for {@link FramedWriter} */
export interface FramedWriterOptions {
    initialBufferSize?: number
}

/** a writer that encodes frames one by one into a writable stream */
export class FramedWriter<Frame = Uint8Array> {
    #writable: IWritable
    #encoder: IFrameEncoder<Frame>
    #buffer: Bytes

    #highWaterMark: number

    /**
     * @param writable  fuman writable stream to write to
     * @param encoder  frame encoder
     * @param options  extra options
     */
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

    /** write a frame to the stream */
    async write(frame: Frame): Promise<void> {
        await this.#encoder.encode(frame, this.#buffer)

        const buffer = this.#buffer.result()

        if (buffer.length > 0) {
            this.#buffer.reset()
            await this.#writable.write(buffer)
        }
    }
}
