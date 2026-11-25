import { Deque } from '../structures/deque.js'

import { Deferred } from './deferred.js'

type WaitResult<T> = { done: true } | { done: false, value: T }

export class AsyncQueue<T> {
  constructor(from?: ArrayLike<T> | Deque<T>) {
    if (from) {
      if (from instanceof Deque) {
        this.queue = from
      } else {
        this.queue = new Deque(from)
      }
    } else {
      this.queue = new Deque()
    }
  }

  /**
   * Underlying deque.
   *
   * Use with care and don't modify it directly,
   * as it may break the async queue's internal state.
   */
  readonly queue: Deque<T>

  #waiters = new Deque<Deferred<WaitResult<T>>>()
  #ended = false

  get length(): number {
    return this.queue.length
  }

  enqueue(item: T): void {
    if (this.#ended) {
      throw new Error('.end() has already been called')
    }

    if (this.#waiters.length > 0) {
      // eslint-disable-next-line ts/no-non-null-assertion
      const waiter = this.#waiters.popFront()!
      waiter.resolve({ done: false, value: item })
      return
    }

    this.queue.pushBack(item)
  }

  end(): void {
    if (this.#ended) {
      throw new Error('.end() has already been called')
    }

    this.#ended = true
    for (const waiter of this.#waiters) {
      waiter.resolve({ done: true })
    }
    this.#waiters.clear()
  }

  get ended(): boolean {
    return this.#ended
  }

  peek(): T | undefined {
    return this.queue.peekFront()
  }

  next(): T | undefined {
    return this.queue.popFront()
  }

  async nextOrWait(): Promise<T | undefined> {
    if (this.queue.length > 0) {
      return this.queue.popFront()
    }
    if (this.#ended) {
      return undefined
    }

    const result = await this.#wait()
    if (result.done) return undefined
    return result.value
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<T> {
    const iterator: AsyncIterableIterator<T> = {
      [Symbol.asyncIterator]: () => iterator,
      next: async () => {
        if (this.queue.length > 0) {
          return { value: this.next() as T, done: false }
        }
        if (this.#ended) return { done: true, value: undefined }

        const result = await this.#wait()
        if (result.done) return { done: true, value: undefined }
        return { value: result.value, done: false }
      },
    }

    return iterator
  }

  #wait(): Promise<WaitResult<T>> {
    const waiter = new Deferred<WaitResult<T>>()
    this.#waiters.pushBack(waiter)
    return waiter.promise
  }
}
