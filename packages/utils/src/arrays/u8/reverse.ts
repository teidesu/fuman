import { alloc } from './pool.js'

export function reverse(buffer: Uint8Array): void {
    if (buffer.length < 2) return

    let i = 0
    let j = buffer.length - 1

    while (i < j) {
        const tmp = buffer[i]
        buffer[i] = buffer[j]
        buffer[j] = tmp
        i++
        j--
    }
}

export function toReversed(buffer: ArrayLike<number>): Uint8Array {
    const end = buffer.length - 1
    const ret = alloc(buffer.length)

    for (let i = 0; i <= end; i++) {
        ret[i] = buffer[end - i]
    }

    return ret
}
