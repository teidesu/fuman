import type { UnsafeMutable } from '../types/misc.js'

export class Deferred<T = void> {
    readonly resolve!: (value: T) => void
    readonly reject!: (reason: unknown) => void
    readonly promise: Promise<T>

    constructor() {
        this.promise = new Promise<T>((res, rej) => {
            ;(this as UnsafeMutable<this>).resolve = res
            ;(this as UnsafeMutable<this>).reject = rej
        })
    }
}
