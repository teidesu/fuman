interface TwoWayLinkedList<K, T> {
  // k = key
  k: K
  // v = value
  v: T
  // p = previous
  p?: TwoWayLinkedList<K, T>
  // n = next
  n?: TwoWayLinkedList<K, T>
}

/**
 * Simple class implementing LRU-like behaviour for a Map
 *
 * Can be used to handle local cache of *something*
 *
 * Uses two-way linked list internally to keep track of insertion/access order
 */
export class LruMap<K, V> {
  #capacity: number
  #first?: TwoWayLinkedList<K, V>
  #last?: TwoWayLinkedList<K, V>
  #map: Map<K, TwoWayLinkedList<K, V>>
  #size = 0

  constructor(
    capacity: number,
    MapImpl: new<K, V>() => Map<K, TwoWayLinkedList<K, V>> = Map,
  ) {
    this.#capacity = capacity
    this.#map = new MapImpl()
  }

  #markUsed(item: TwoWayLinkedList<K, V>): void {
    if (item === this.#first) {
      return // already the most recently used
    }

    if (item.p) {
      if (item === this.#last) {
        this.#last = item.p
      }
      item.p.n = item.n
    }

    if (item.n) {
      item.n.p = item.p
    }

    item.p = undefined
    item.n = this.#first

    if (this.#first) {
      this.#first.p = item
    }
    this.#first = item
  }

  get(key: K): V | undefined {
    const item = this.#map.get(key)
    if (!item) return undefined

    this.#markUsed(item)

    return item.v
  }

  has(key: K): boolean {
    return this.#map.has(key)
  }

  #remove(item: TwoWayLinkedList<K, V>): void {
    if (item.p) {
      this.#last = item.p
      this.#last.n = undefined
    } else {
      // exhausted
      this.#last = undefined
      this.#first = undefined
    }

    // remove strong refs to and from the item
    item.p = item.n = undefined
    this.#map.delete(item.k)
    this.#size -= 1
  }

  set(key: K, value: V): void {
    let item = this.#map.get(key)

    if (item) {
      // already in cache, update
      item.v = value
      this.#markUsed(item)

      return
    }

    item = {
      k: key,
      v: value,
      // for jit to optimize stuff
      n: undefined,
      p: undefined,
    }
    this.#map.set(key, item)

    if (this.#first) {
      this.#first.p = item
      item.n = this.#first
    } else {
      // first item ever
      this.#last = item
    }

    this.#first = item
    this.#size += 1

    if (this.#size > this.#capacity) {
      // remove the last item
      const oldest = this.#last

      if (oldest) {
        this.#remove(oldest)
      }
    }
  }

  delete(key: K): void {
    const item = this.#map.get(key)
    if (item) this.#remove(item)
  }

  clear(): void {
    this.#map.clear()
    this.#first = undefined
    this.#last = undefined
    this.#size = 0
  }
}
