import { describe, expect, it } from 'vitest'

import { BufferPool } from './pool.js'

describe('BufferPool', () => {
  it('should allocate buffers', () => {
    const pool = new BufferPool(16)

    expect(pool.alloc(1)).toEqual(new Uint8Array([0]))
    expect(pool.alloc(2)).toEqual(new Uint8Array([0, 0]))
    expect(pool.alloc(3)).toEqual(new Uint8Array([0, 0, 0]))
    expect(pool.alloc(4)).toEqual(new Uint8Array([0, 0, 0, 0]))
    expect(pool.alloc(5)).toEqual(new Uint8Array([0, 0, 0, 0, 0]))
    expect(pool.alloc(6)).toEqual(new Uint8Array([0, 0, 0, 0, 0, 0]))
    expect(pool.alloc(7)).toEqual(new Uint8Array([0, 0, 0, 0, 0, 0, 0]))
    expect(pool.alloc(8)).toEqual(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]))
  })

  it('should allocate small buffers from the pool', () => {
    const pool = new BufferPool(1024 * 8)

    const first = pool.alloc(1)

    for (let i = 1; i < 100; i++) {
      const buf = pool.alloc(i)
      expect(buf.length).toBe(i)
      expect(buf.byteLength).toBe(i)
      expect(buf.byteOffset).not.toBe(0)
      expect(buf.buffer).toBe(first.buffer)
    }
  })

  it('should allocate large buffers directly', () => {
    const pool = new BufferPool(1024 * 8)

    const first = pool.alloc(1)

    expect(pool.alloc(1024 * 4 - 1).buffer).toBe(first.buffer)
    expect(pool.alloc(1024 * 4).buffer).not.toBe(first.buffer)
  })

  it('should allocate a new buffer when the pool is exhausted', () => {
    const pool = new BufferPool(1)

    const first = pool.alloc(1024 * 4 - 1)
    const second = pool.alloc(1024 * 4 - 1)

    expect(first.buffer).not.toBe(second.buffer)
  })
})
