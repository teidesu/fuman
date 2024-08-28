import { maybeWrapIterator } from './_iter.js'

/**
 * A `Set`-compatible class that allows using a custom key mapper
 * function for both reading and writing.
 *
 * > **Important**: `union` and similar methods are not supported,
 * > as there's no way which kind of key the other set uses.
 * > This might change in the future.
 */
export class CustomSet<ExternalKey, InternalKey> implements Set<ExternalKey> {
    #set: Set<InternalKey>
    #mapperTo: (key: ExternalKey) => InternalKey
    #mapperFrom: (key: InternalKey) => ExternalKey

    readonly clear: Set<ExternalKey>['clear']

    constructor(
        externalToInternal: (key: ExternalKey) => InternalKey,
        internalToExternal: (key: InternalKey) => ExternalKey,
    ) {
        this.#mapperTo = externalToInternal
        this.#mapperFrom = internalToExternal

        const set = this.#set = new Set()
        this.clear = set.clear.bind(set)
    }

    get size(): number {
        return this.#set.size
    }

    add(value: ExternalKey): this {
        this.#set.add(this.#mapperTo(value))
        return this
    }

    delete(value: ExternalKey): boolean {
        return this.#set.delete(this.#mapperTo(value))
    }

    forEach(callbackfn: (value: ExternalKey, value2: ExternalKey, set: Set<ExternalKey>) => void, thisArg?: any): void {
        this.#set.forEach((value) => {
            const mapped = this.#mapperFrom(value)
            callbackfn.call(thisArg, mapped, mapped, this)
        })
    }

    has(value: ExternalKey): boolean {
        return this.#set.has(this.#mapperTo(value))
    }

    entries(): ReturnType<Set<ExternalKey>['entries']> {
        const inner = this.#set.entries()

        const iterator: IterableIterator<[ExternalKey, ExternalKey]> = {
            [Symbol.iterator]: () => iterator,
            next: () => {
                const { done, value } = inner.next() as IteratorResult<[InternalKey, InternalKey], undefined>
                if (done) return { done, value }

                const mapped = this.#mapperFrom(value[0])

                return {
                    done,
                    value: [mapped, mapped] as const,
                }
            },
        }

        return maybeWrapIterator(iterator) as ReturnType<Set<ExternalKey>['entries']>
    }

    keys(): ReturnType<Set<ExternalKey>['keys']> {
        const inner = this.#set.keys()

        const iterator: IterableIterator<ExternalKey> = {
            [Symbol.iterator]: () => iterator,
            next: () => {
                const { done, value } = inner.next() as IteratorResult<InternalKey, undefined>
                if (done) return { done, value: undefined }

                return {
                    done,
                    value: this.#mapperFrom(value),
                }
            },
        }

        return maybeWrapIterator(iterator) as ReturnType<Set<ExternalKey>['keys']>
    }

    values(): ReturnType<Set<ExternalKey>['keys']> {
        return this.keys()
    }

    union<U>(): Set<ExternalKey | U> {
        throw new Error('Method not supported.')
    }

    intersection<U>(): Set<ExternalKey & U> {
        throw new Error('Method not supported.')
    }

    difference(): Set<ExternalKey> {
        throw new Error('Method not supported.')
    }

    symmetricDifference<U>(): Set<ExternalKey | U> {
        throw new Error('Method not supported.')
    }

    isSubsetOf(): boolean {
        throw new Error('Method not supported.')
    }

    isSupersetOf(): boolean {
        throw new Error('Method not supported.')
    }

    isDisjointFrom(): boolean {
        throw new Error('Method not supported.')
    }

    [Symbol.iterator](): ReturnType<Set<ExternalKey>['keys']> {
        return this.keys()
    }

    get [Symbol.toStringTag](): string {
        return this.#set[Symbol.toStringTag]
    }

    getInternalSet(): Set<InternalKey> {
        return this.#set
    }
}
