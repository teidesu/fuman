import { describe, expect, it } from 'vitest'

import { AsyncQueue } from './async-queue.js'

describe('AsyncQueue', () => {
  it('should work as a normal FIFO queue', async () => {
    const queue = new AsyncQueue<number>()

    queue.enqueue(1)
    queue.enqueue(2)
    queue.enqueue(3)

    expect(queue.length).toBe(3)

    expect(queue.next()).toBe(1)
    expect(queue.next()).toBe(2)
    expect(queue.next()).toBe(3)
  })

  it('should work as a simple async iterator after .end() call', async () => {
    const queue = new AsyncQueue<number>()

    queue.enqueue(1)
    queue.enqueue(2)
    queue.enqueue(3)
    queue.end()

    const items: number[] = []
    for await (const item of queue) {
      items.push(item)
    }

    expect(items).toEqual([1, 2, 3])
  })

  it('should throw if .end() is called twice', async () => {
    const queue = new AsyncQueue<number>()

    queue.enqueue(1)
    queue.enqueue(2)
    queue.enqueue(3)

    queue.end()

    expect(() => queue.end()).toThrow('.end() has already been called')
  })

  it('should throw if .enqueue() is called after .end() call', async () => {
    const queue = new AsyncQueue<number>()

    queue.enqueue(1)
    queue.enqueue(2)
    queue.enqueue(3)

    queue.end()

    expect(() => queue.enqueue(4)).toThrow('.end() has already been called')
  })

  it('should wait for the next items if no items are currently available', async () => {
    const queue = new AsyncQueue<number>()

    const promise = queue.nextOrWait()

    queue.enqueue(1)
    queue.enqueue(2)
    queue.enqueue(3)

    expect(await promise).toBe(1)
    expect(queue.length).toBe(2)
    expect(queue.next()).toBe(2)
    expect(queue.next()).toBe(3)
  })

  it('should queue multiple pending promises', async () => {
    const queue = new AsyncQueue<number>()

    const promise1 = queue.nextOrWait()
    const promise2 = queue.nextOrWait()

    queue.enqueue(1)
    queue.enqueue(2)
    queue.enqueue(3)

    expect(await promise1).toBe(1)
    expect(await promise2).toBe(2)
    expect(queue.length).toBe(1)
    expect(queue.next()).toBe(3)
  })

  it('should resolve all pending promises to undefined on .end()', async () => {
    const queue = new AsyncQueue<number>()

    const promise1 = queue.nextOrWait()
    const promise2 = queue.nextOrWait()
    const promise3 = queue.nextOrWait()

    queue.enqueue(1)
    queue.end()

    expect(await promise1).toBe(1)
    expect(await promise2).toBeUndefined()
    expect(await promise3).toBeUndefined()
    expect(queue.length).toBe(0)
  })
})
