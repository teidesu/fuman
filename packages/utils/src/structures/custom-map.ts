import { maybeWrapIterator } from './_iter.js'

/**
 * A `Map`-compatible class that allows using a custom key mapper
 * function for both reading and writing.
 */
export class CustomMap<ExternalKey, InternalKey, V> implements Map<ExternalKey, V> {
  #map: Map<InternalKey, V>
  #mapperTo: (key: ExternalKey) => InternalKey
  #mapperFrom: (key: InternalKey) => ExternalKey

  readonly clear: Map<ExternalKey, V>['clear']

  constructor(
    externalToInternal: (key: ExternalKey) => InternalKey,
    internalToExternal: (key: InternalKey) => ExternalKey,
  ) {
    this.#mapperTo = externalToInternal
    this.#mapperFrom = internalToExternal

    const map = this.#map = new Map()
    this.clear = map.clear.bind(this.#map)
  }

  getInternalMap(): Map<InternalKey, V> {
    return this.#map
  }

  delete(key: ExternalKey): boolean {
    return this.#map.delete(this.#mapperTo(key))
  }

  forEach(callbackfn: (value: V, key: ExternalKey, map: Map<ExternalKey, V>) => void, thisArg?: any): void {
    return this.#map.forEach((value, key) => {
      callbackfn.call(thisArg, value, this.#mapperFrom(key), this)
    })
  }

  get(key: ExternalKey): V | undefined {
    return this.#map.get(this.#mapperTo(key))
  }

  has(key: ExternalKey): boolean {
    return this.#map.has(this.#mapperTo(key))
  }

  set(key: ExternalKey, value: V): this {
    this.#map.set(this.#mapperTo(key), value)
    return this
  }

  get size(): number {
    return this.#map.size
  }

  entries(): ReturnType<Map<ExternalKey, V>['entries']> {
    const inner = this.#map.entries()

    const iterator: IterableIterator<[ExternalKey, V]> = {
      [Symbol.iterator]: () => iterator,
      next: () => {
        const { done, value } = inner.next() as IteratorResult<[InternalKey, V], undefined>
        if (done) return { done, value }

        return {
          done,
          value: [this.#mapperFrom(value[0]), value[1]] as const,
        }
      },
    }

    return maybeWrapIterator(iterator) as ReturnType<Map<ExternalKey, V>['entries']>
  }

  keys(): ReturnType<Map<ExternalKey, V>['keys']> {
    const inner = this.#map.keys()

    const iterator: IterableIterator<ExternalKey> = {
      [Symbol.iterator]: () => iterator,
      next: () => {
        const { done, value } = inner.next() as IteratorResult<InternalKey, undefined>
        if (done) return { done, value }

        return {
          done,
          value: this.#mapperFrom(value),
        }
      },
    }

    return maybeWrapIterator(iterator) as ReturnType<Map<ExternalKey, V>['keys']>
  }

  values(): ReturnType<Map<ExternalKey, V>['values']> {
    const inner = this.#map.values()

    const iterator: IterableIterator<V> = {
      [Symbol.iterator]: () => iterator,
      next: () => {
        const { done, value } = inner.next() as IteratorResult<V, undefined>
        if (done) return { done, value }

        return {
          done,
          value,
        }
      },
    }

    return maybeWrapIterator(iterator) as ReturnType<Map<ExternalKey, V>['values']>
  }

  [Symbol.iterator](): ReturnType<Map<ExternalKey, V>['entries']> {
    return this.entries()
  }

  get [Symbol.toStringTag](): string {
    return this.#map[Symbol.toStringTag]
  }
}
