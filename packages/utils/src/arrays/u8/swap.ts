/**
 * Swap byte order of the byte array **in place**,
 * interpreting the buffer as an array of 16-bit integers
 *
 * @example `swap16(new Uint8Array([0x12, 0x34, 0x56, 0x78])) // becomes [0x34, 0x12, 0x78, 0x56]
 * @throws RangeError when the buffer length is not a multiple of 2
 */
export function swap16(buf: Uint8Array): void {
    if (buf.length % 2 !== 0) {
        throw new RangeError('Buffer length must be a multiple of 2')
    }

    for (let i = 0; i < buf.length; i += 2) {
        const tmp = buf[i]
        buf[i] = buf[i + 1]
        buf[i + 1] = tmp
    }
}

/**
 * Swap byte order of the byte array **in place**,
 * interpreting the buffer as an array of 32-bit integers
 *
 * @example `swap32(new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0])) // becomes [0x78, 0x56, 0x34, 0x12, 0xf0, 0xde, 0xbc, 0x9a]
 * @throws RangeError when the buffer length is not a multiple of 4
 */
export function swap32(buf: Uint8Array): void {
    if (buf.length % 4 !== 0) {
        throw new RangeError('Buffer length must be a multiple of 4')
    }

    for (let i = 0; i < buf.length; i += 4) {
        let tmp = buf[i]
        buf[i] = buf[i + 3]
        buf[i + 3] = tmp

        tmp = buf[i + 1]
        buf[i + 1] = buf[i + 2]
        buf[i + 2] = tmp
    }
}

/**
 * Swap byte order of the byte array **in place**,
 * interpreting the buffer as an array of 64-bit integers
 *
 * @example `swap32(new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0])) // becomes [0xf0, 0xde, 0xbc, 0x9a, 0x78, 0x56, 0x34, 0x12]
 * @throws RangeError when the buffer length is not a multiple of 4
 */
export function swap64(buf: Uint8Array): void {
    if (buf.length % 8 !== 0) {
        throw new RangeError('Buffer length must be a multiple of 8')
    }

    for (let i = 0; i < buf.length; i += 8) {
        let tmp = buf[i]
        buf[i] = buf[i + 7]
        buf[i + 7] = tmp

        tmp = buf[i + 1]
        buf[i + 1] = buf[i + 6]
        buf[i + 6] = tmp

        tmp = buf[i + 2]
        buf[i + 2] = buf[i + 5]
        buf[i + 5] = tmp

        tmp = buf[i + 3]
        buf[i + 3] = buf[i + 4]
        buf[i + 4] = tmp
    }
}

/**
 * Swap the *half-byte* ordering of each byte in the byte array, **in place**
 *
 * @example `swap8(new Uint8Array([0x12, 0x34, 0x56, 0x78])) // becomes [0x21, 0x43, 0x65, 0x87]
 */
export function swapNibbles(buf: Uint8Array): void {
    for (let i = 0; i < buf.length; i++) {
        buf[i] = ((buf[i] & 0xF0) >> 4) | ((buf[i] & 0x0F) << 4)
    }
}
