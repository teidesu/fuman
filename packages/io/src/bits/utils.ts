const REV_8BIT_LOOKUP = [
    0x0,
    0x8,
    0x4,
    0xC,
    0x2,
    0xA,
    0x6,
    0xE,
    0x1,
    0x9,
    0x5,
    0xD,
    0x3,
    0xB,
    0x7,
    0xF,
]

/** Reverse bit ordering of a single byte */
export function reverse8Bits(byte: number): number {
    return (REV_8BIT_LOOKUP[byte & 0b1111] << 4) | REV_8BIT_LOOKUP[byte >> 4]
}

/** Reverse bits of a numeric value, treating it as a `size`-bit number */
export function reverseBits(value: number, size: number): number {
    let result = 0

    for (let i = 0; i < size; i++) {
        result |= ((value >> i) & 1) << (size - i - 1)
    }

    return result
}

/** Reverse bits of a bigint, treating it as a `size`-bit number */
export function reverseBitsBig(value: bigint, size: number | bigint): bigint {
    if (typeof size === 'number') {
        size = BigInt(size)
    }

    let result = 0n

    for (let i = 0n; i < size; i++) {
        result |= ((value >> i) & 1n) << (size - i - 1n)
    }

    return result
}

/**
 * Reverse the bit ordering of each byte in the byte array, **in place**
 *
 * @example `reverseBitsAll(new Uint8Array([0b10101010, 0b01010101])) // becomes [0b01010101, 0b10101010]
 */
export function reverseBitsAll(buf: Uint8Array): void {
    for (let i = 0; i < buf.length; i++) {
        buf[i] = reverse8Bits(buf[i])
    }
}
