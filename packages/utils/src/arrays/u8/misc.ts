/**
 * An empty byte array with zero length
 */
export const empty: Uint8Array = new Uint8Array(0)

export function clone(buf: Uint8Array): Uint8Array {
    return new Uint8Array(buf)
}

/** Read N-th bit of a number (starting from the least significant bit) */
export function readNthBit(byte: number, bit: number): number {
    return (byte & (1 << bit)) >> bit
}
