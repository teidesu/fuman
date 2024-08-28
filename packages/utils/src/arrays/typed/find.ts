import type { TypedArray } from './types.js'

export function indexOf(haystack: Exclude<TypedArray, BigInt64Array | BigUint64Array>, needle: number, start?: number): number
export function indexOf(haystack: BigInt64Array | BigUint64Array, needle: bigint, start?: number): number

export function indexOf(haystack: TypedArray, needle: number | bigint, start = 0): number {
    for (let i = start; i < haystack.length; i++) {
        if (haystack[i] === needle) {
            return i
        }
    }

    return -1
}

export function lastIndexOf(haystack: Exclude<TypedArray, BigInt64Array | BigUint64Array>, needle: number, start?: number): number
export function lastIndexOf(haystack: BigInt64Array | BigUint64Array, needle: bigint, start?: number): number

export function lastIndexOf(haystack: TypedArray, needle: number | bigint, start = haystack.length - 1): number {
    for (let i = start; i >= 0; i--) {
        if (haystack[i] === needle) {
            return i
        }
    }

    return -1
}

export function indexOfArray<T extends TypedArray>(haystack: T, needle: T, start = 0): number {
    if (needle.length === 0) {
        return start
    }

    if (needle.length === 1) {
        // not exactly safe casts, but we know that they are of the correct type because of the generic constraint
        return indexOf(haystack as Uint8Array, needle[0] as number, start)
    }

    const max = haystack.length - needle.length
    for (let i = start; i <= max; i++) {
        if (haystack[i] === needle[0]) {
            let j = 1
            for (; j < needle.length; j++) {
                if (haystack[i + j] !== needle[j]) {
                    break
                }
            }

            if (j === needle.length) {
                return i
            }
        }
    }

    return -1
}

export function lastIndexOfArray<T extends TypedArray>(haystack: T, needle: T, start: number = haystack.length - 1): number {
    if (needle.length === 0) {
        return start
    }

    if (needle.length === 1) {
        // not exactly safe casts, but we know that they are of the correct type because of the generic constraint
        return lastIndexOf(haystack as Uint8Array, needle[0] as number, start)
    }

    const min = needle.length - 1
    for (let i = start; i >= min; i--) {
        if (haystack[i] === needle[needle.length - 1]) {
            let j = needle.length - 2
            for (; j >= 0; j--) {
                if (haystack[i - needle.length + j + 1] !== needle[j]) {
                    break
                }
            }

            if (j < 0) {
                return i - needle.length + 1
            }
        }
    }

    return -1
}

export function includes(haystack: Exclude<TypedArray, BigInt64Array | BigUint64Array>, needle: number): boolean
export function includes(haystack: BigInt64Array | BigUint64Array, needle: bigint): boolean

export function includes(haystack: TypedArray, needle: number | bigint): boolean {
    // not exactly safe casts, but we know that they are of the correct type because of the generic constraint
    return indexOf(haystack as Uint8Array, needle as number) !== -1
}

export function includesArray<T extends TypedArray>(haystack: T, needle: T): boolean {
    return indexOfArray(haystack, needle) !== -1
}
