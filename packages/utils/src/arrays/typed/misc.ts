import type { TypedArray } from './types.js'

/**
 * Shortcut for creating a DataView from a typed array
 */
export function toDataView(buf: TypedArray): DataView {
    return new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
}

export function view<Res extends TypedArray>(
    ctor: {
        new (buffer: ArrayBufferLike, byteOffset: number, byteLength: number): Res
        BYTES_PER_ELEMENT: number
    },
    buf: ArrayBufferView,
): Res {
    // eslint-disable-next-line new-cap
    return new ctor(buf.buffer, buf.byteOffset, buf.byteLength / ctor.BYTES_PER_ELEMENT)
}

let _cachedByteOrder: boolean | null = null

/** Get the platform byte order (which is used in typed arrays) */
export function getPlatformByteOrder(): 'little' | 'big' {
    if (_cachedByteOrder === null) {
        // > The Uint16Array typed array represents an array of 16-bit unsigned integers in the platform byte order.
        // > If control over byte order is needed, use DataView instead.
        // (from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint16Array)
        // we can abuse this to determine the platform byte order
        const buffer = new ArrayBuffer(2)
        const view = new DataView(buffer)
        view.setUint16(0, 0x1234, true)
        _cachedByteOrder = new Uint16Array(buffer)[0] === 0x1234
    }

    return _cachedByteOrder ? 'little' : 'big'
}
