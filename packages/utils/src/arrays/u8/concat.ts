import { alloc } from './pool.js'

// shim for deno
declare const Buffer: typeof import('node:buffer').Buffer

/**
 * Concatenate multiple byte arrays into one
 */
export function concat(buffers: Uint8Array[]): Uint8Array {
    if (typeof Buffer !== 'undefined') {
        const buf = Buffer.concat(buffers)
        return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
    }

    if (buffers.length === 1) {
        return buffers[0]
    }

    let length = 0

    for (let i = 0; i < buffers.length; i++) {
        length += buffers[i].length
    }

    const ret = alloc(length)
    let offset = 0

    for (let i = 0; i < buffers.length; i++) {
        const buf = buffers[i]
        ret.set(buf, offset)
        offset += buf.length
    }

    return ret
}

/**
 * Concatenate two byte arrays into one, always copying the data.
 *
 * @param a  First byte array
 * @param b  Second byte array
 */
export function concat2(a: ArrayLike<number>, b: ArrayLike<number>): Uint8Array {
    const ret = alloc(a.length + b.length)
    ret.set(a)
    ret.set(b, a.length)
    return ret
}

/**
 * Concatenate three byte arrays into one, always copying the data.
 *
 * @param a  First byte array
 * @param b  Second byte array
 * @param c  Third byte array
 */
export function concat3(a: ArrayLike<number>, b: ArrayLike<number>, c: ArrayLike<number>): Uint8Array {
    const ret = alloc(a.length + b.length + c.length)
    ret.set(a)
    ret.set(b, a.length)
    ret.set(c, a.length + b.length)
    return ret
}
