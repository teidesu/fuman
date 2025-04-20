/* eslint-disable ts/no-unsafe-argument */
interface OneWayLinkedList<T> {
  v: T
  n?: OneWayLinkedList<T>
}

/**
 * Simple class implementing LRU-like behaviour for a Set.
 *
 * Note: this is not exactly LRU, but rather "least recently added"
 * and doesn't mark items as recently added if they are already in the set.
 *
 * Uses one-way linked list internally to keep track of insertion order
 */
export class LruSet<T> {
  #capacity: number
  #first?: OneWayLinkedList<T>
  #last?: OneWayLinkedList<T>
  #set: Set<T>

  constructor(
    capacity: number,
        SetImpl: new() => Set<T> = Set,
  ) {
    this.#capacity = capacity
    this.#set = new SetImpl()
  }

  clear(): void {
    this.#first = this.#last = undefined
    this.#set.clear()
  }

  add(val: T): void {
    if (this.#set.has(val as any)) return

    if (!this.#first) this.#first = { v: val }

    if (!this.#last) {
      this.#last = this.#first
    } else {
      this.#last.n = { v: val }
      this.#last = this.#last.n
    }

    this.#set.add(val as any)

    if (this.#set.size > this.#capacity && this.#first !== undefined) {
      // remove least recently used
      this.#set.delete(this.#first.v as any)
      this.#first = this.#first.n
    }
  }

  has(val: T): boolean {
    return this.#set.has(val as any)
  }
}
