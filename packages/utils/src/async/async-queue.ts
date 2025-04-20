import { Deque } from '../structures/deque.js'

import { Deferred } from './deferred.js'

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

  #waiters = new Deque<Deferred<T | undefined>>()
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
      waiter.resolve(item)
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
      waiter.resolve(undefined)
    }
    this.#waiters.clear()
  }

  peek(): T | undefined {
    return this.queue.peekFront()
  }

  next(): T | undefined {
    return this.queue.popFront()
  }

  async nextOrWait(): Promise<T | undefined> {
    if (this.queue.length > 0 || this.#ended) {
      return this.queue.popFront()
    }

    const waiter = new Deferred<T | undefined>()
    this.#waiters.pushBack(waiter)

    return waiter.promise
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<T> {
    const iterator: AsyncIterableIterator<T> = {
      [Symbol.asyncIterator]: () => iterator,
      next: async () => {
        const item = await this.nextOrWait()
        if (item === undefined) return { done: true, value: undefined }

        return { value: item, done: false }
      },
    }

    return iterator
  }
}
