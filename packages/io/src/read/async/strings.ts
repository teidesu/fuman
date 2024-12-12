import type { IReadable } from '../../types.js'
import { u8 } from '@fuman/utils'

import { Bytes } from '../../bytes.js'
import { PartialReadError } from '../../errors.js'

/**
 * read exactly N bytes from the source
 *
 * @param readable  fuman readable stream
 * @param length  length of the buffer to read, or a buffer to read into (when a number is passed, a new buffer will be allocated)
 * @param onEof  what to do when the end of the stream is reached
 *  - `error` - throw an {@link PartialReadError}
 *  - `truncate` - truncate the buffer to the number of bytes that were read. note that this might return 0 bytes
 */
export async function exactly(
    readable: IReadable,
    length: number | Uint8Array,
    onEof: 'error' | 'truncate' = 'error',
): Promise<Uint8Array> {
    const res = typeof length === 'number' ? u8.alloc(length) : length
    let remaining = res.length
    let pos = 0

    while (remaining > 0) {
        const read = await readable.read(res.subarray(pos, pos + remaining))

        if (read === 0) {
            if (onEof === 'error') {
                throw new PartialReadError(
                    res.subarray(0, pos),
                    res.length,
                )
            } else {
                return res.subarray(0, pos)
            }
        }

        remaining -= read
        pos += read
    }

    return res
}

/**
 * read the source until it ends, and return the buffer
 *
 * @param readable  fuman readable stream
 * @param chunkSize  size of the chunks to read
 */
export async function untilEnd(readable: IReadable, chunkSize: number = 1024 * 16): Promise<Uint8Array> {
    const buf = Bytes.alloc(chunkSize)

    while (true) {
        const into = buf.writeSync(chunkSize)
        const read = await readable.read(into)
        buf.disposeWriteSync(read)

        if (read === 0) {
            break
        }
    }

    return buf.result()
}
