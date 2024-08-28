import { u8 } from '../arrays/index.js'

import { bitLength } from './math.js'

/**
 * Convert a big integer to a byte array
 *
 * @param value  Value to convert
 * @param length  Length of the resulting buffer (by default it's the minimum required)
 * @param le  Whether to use little-endian encoding
 */
export function toBytes(value: bigint, length = 0, le = false): Uint8Array {
    const bits = bitLength(value)
    const bytes = Math.ceil(bits / 8)

    if (length !== 0 && bytes > length) {
        throw new Error('Value out of bounds')
    }

    if (length === 0) length = bytes

    const buf = new ArrayBuffer(length)
    const u8 = new Uint8Array(buf)

    const unaligned = length % 8
    const dv = new DataView(buf, 0, length - unaligned)

    // it is faster to work with 64-bit words than with bytes directly
    for (let i = 0; i < dv.byteLength; i += 8) {
        dv.setBigUint64(i, value & 0xFFFFFFFFFFFFFFFFn, true)
        value >>= 64n
    }

    if (unaligned > 0) {
        for (let i = length - unaligned; i < length; i++) {
            u8[i] = Number(value & 0xFFn)
            value >>= 8n
        }
    }

    if (!le) u8.reverse()

    return u8
}

/**
 * Convert a byte array to a big integer
 *
 * @param buffer  Byte array to convert
 * @param le  Whether to use little-endian encoding
 */
export function fromBytes(buffer: Uint8Array, le = false): bigint {
    if (le) buffer = u8.toReversed(buffer)

    const unaligned = buffer.length % 8
    const dv = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength - unaligned)

    let res = 0n

    // it is faster to work with 64-bit words than with bytes directly
    for (let i = 0; i < dv.byteLength; i += 8) {
        res = (res << 64n) | BigInt(dv.getBigUint64(i, false))
    }

    if (unaligned > 0) {
        for (let i = buffer.length - unaligned; i < buffer.length; i++) {
            res = (res << 8n) | BigInt(buffer[i])
        }
    }

    return res
}
