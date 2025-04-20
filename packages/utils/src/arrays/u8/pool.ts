import { empty } from './misc.js'

/**
 * Pool for buffer allocations, as seen in [Node.js](https://github.com/nodejs/node/blob/main/lib/buffer.js)
 */
export class BufferPool {
  #offset!: number
  #pool!: ArrayBuffer
  #remaining!: number
  #maxAllocSize: number

  constructor(readonly size: number) {
    this.#maxAllocSize = size >>> 1
    this.#realloc()
  }

  #realloc() {
    this.#pool = new ArrayBuffer(this.size)
    this.#offset = 0
    this.#remaining = this.size
  }

  #align() {
    if (this.#offset & 0x7) {
      this.#offset |= 0x7
      this.#offset++
      this.#remaining = this.size - this.#offset
    }
  }

  alloc(size: number): Uint8Array {
    if (size === 0) return empty
    if (size < this.#maxAllocSize) {
      if (size > this.#remaining) { this.#realloc() }
      const b = new Uint8Array(this.#pool, this.#offset, size)
      this.#offset += size
      this.#remaining -= size
      this.#align()
      return b
    }

    return new Uint8Array(size)
  }
}

let defaultPool = /* #__PURE__ */ new BufferPool(16 * 1024)

/**
 * Override the default buffer pool size (the one used by `u8.alloc`)
 */
export function setDefaultPoolSize(size: number): void {
  defaultPool = new BufferPool(size)
}

/**
 * Allocate a new buffer of the given size.
 * For smaller sizes, the allocation will be from the default buffer pool,
 * similar to `Buffer.alloc` in Node.js
 */
export function alloc(size: number): Uint8Array {
  return defaultPool.alloc(size)
}

/**
 * Shortcut for allocating a buffer and filling it with the given data,
 * similar to `Buffer.from` in Node.js
 */
export function allocWith(init: ArrayLike<number>): Uint8Array {
  const buf = alloc(init.length)
  buf.set(init)
  return buf
}
