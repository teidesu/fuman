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

export class DeferredTracked<T = void> {
  #resolve!: (value: T) => void
  #reject!: (reason: unknown) => void
  readonly promise: Promise<T>

  readonly status:
    | { type: 'pending' }
    | { type: 'fulfilled', value: T }
    | { type: 'rejected', reason: unknown }

  constructor() {
    this.status = { type: 'pending' }
    this.promise = new Promise<T>((res, rej) => {
      this.#resolve = res
      this.#reject = rej
    })
  }

  resolve(value: T): void {
    if (this.status.type !== 'pending') return

    (this as UnsafeMutable<this>).status = { type: 'fulfilled', value }
    this.#resolve(value)
  }

  reject(reason: unknown): void {
    if (this.status.type !== 'pending') return

    (this as UnsafeMutable<this>).status = { type: 'rejected', reason }
    this.#reject(reason)
  }

  get result(): T | undefined {
    if (this.status.type === 'fulfilled') {
      return this.status.value
    }

    return undefined
  }

  get error(): unknown | undefined {
    if (this.status.type === 'rejected') {
      return this.status.reason
    }

    return undefined
  }
}
