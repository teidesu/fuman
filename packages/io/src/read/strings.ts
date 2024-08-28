import type { ISyncReadable } from '../types.js'
import { utf8 } from '@fuman/utils'

import { Bytes } from '../bytes.js'
import { PartialReadError } from '../errors.js'

export function exactly(readable: ISyncReadable, length: number): Uint8Array {
    const buf = readable.readSync(length)
    if (buf.length < length) {
        throw new PartialReadError(buf, length)
    }

    return buf
}

export function rawString(readable: ISyncReadable, length: number): string {
    const buf = exactly(readable, length)
    let result = ''
    for (let i = 0; i < length; i++) {
        result += String.fromCharCode(buf[i])
    }
    return result
}

export function utf8String(readable: ISyncReadable, length: number): string {
    return utf8.decoder.decode(exactly(readable, length))
}

export function untilCondition(readable: ISyncReadable, condition: (byte: number) => boolean): Uint8Array {
    const buf = Bytes.alloc()
    while (true) {
        const byte = readable.readSync(1)
        if (byte.length === 0) {
            throw new PartialReadError(buf.result(), buf.available + 1)
        }

        buf.writeSync(1)[0] = byte[0]

        if (condition(byte[0])) {
            break
        }
    }
    return buf.result()
}

export function untilEnd(readable: ISyncReadable, chunkSize = 1024): Uint8Array {
    const buf = Bytes.alloc(chunkSize)
    while (true) {
        const chunk = readable.readSync(chunkSize)
        if (chunk.length === 0) {
            break
        }
        buf.writeSync(chunk.length).set(chunk)
    }

    return buf.result()
}

export function untilZero(readable: ISyncReadable): Uint8Array {
    return untilCondition(readable, byte => byte === 0)
}

export function cUtf8String(readable: ISyncReadable): string {
    const buf = untilZero(readable)
    return utf8.decoder.decode(buf.subarray(0, buf.length - 1))
}

export function lengthPrefixed(readLength: (readable: ISyncReadable) => number, readable: ISyncReadable): Uint8Array {
    const length = readLength(readable)
    return exactly(readable, length)
}
