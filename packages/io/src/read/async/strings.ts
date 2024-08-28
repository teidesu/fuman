import type { IReadable } from '../../types.js'
import { u8 } from '@fuman/utils'

import { Bytes } from '../../bytes.js'
import { PartialReadError } from '../../errors.js'

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
