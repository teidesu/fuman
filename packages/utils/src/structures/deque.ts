/* eslint-disable ts/no-non-null-assertion */
/* eslint-disable unicorn/no-new-array */
// Based on denque (https://github.com/invertase/denque, Apache 2 license)
// Rewritten in modern TypeScript, added some missing features and removed some unnecessary ones
// that were only there for compatibility with Array

const LOG2 = /* #__PURE__ */ Math.log(2)

function _nextPowerOf2(num: number) {
    const log2 = Math.log(num) / LOG2
    const nextPow2 = 1 << (log2 + 1)

    return Math.max(nextPow2, 4)
}

export interface DequeOptions {
    /**
     * Maximum number of items in the queue.
     * When the queue is full, adding new items will remove the items
     * at the other end of the queue.
     */
    capacity?: number
}

/**
 * Custom implementation of a double ended queue.
 */
export class Deque<T> {
    protected _list!: (T | undefined)[]
    protected _head: number
    protected _tail: number
    protected _capacityMask!: number
    protected _capacity?: number

    constructor(array?: ArrayLike<T>, options: DequeOptions = {}) {
        this._head = 0
        this._tail = 0
        this._capacity = options.capacity

        if (array) {
            this.#fromArray(array)
        } else {
            this._capacityMask = 0x3
            this._list = Array.from({ length: 4 })
        }
    }

    /**
     * Return the number of items on the list, or 0 if empty.
     */
    get length(): number {
        if (this._head === this._tail) return 0
        if (this._head < this._tail) return this._tail - this._head
        else return this._capacityMask + 1 - (this._head - this._tail)
    }

    /**
     * Returns the item at the specified index from the list.
     * 0 is the first element, 1 is the second, and so on...
     * Elements at negative values are that many from the end: -1 is one before the end
     * (the last element), -2 is two before the end (one before last), etc.
     * Returns undefined if the index is out of bounds.
     *
     * @param index
     */
    at(index: number): T | undefined {
        let i = index
        // expect a number or return undefined
        if ((i !== (i | 0))) {
            return undefined
        }
        const len = this.length

        if (i >= len || i < -len) return undefined
        if (i < 0) i += len
        i = (this._head + i) & this._capacityMask
        return this._list[i]
    }

    /**
     * Returns the first item in the list without removing it.
     */
    peekFront(): T | undefined {
        if (this._head === this._tail) return undefined
        return this._list[this._head]
    }

    /**
     * Returns the last item in the list without removing it.
     */
    peekBack(): T | undefined {
        if (this._head === this._tail) return undefined
        return this._list[this._tail - 1]
    }

    /**
     * Add an item at the beginning of the list.
     * @param item
     */
    pushFront(item: T): number {
        const len = this._list.length
        this._head = (this._head - 1 + len) & this._capacityMask
        this._list[this._head] = item
        if (this._tail === this._head) this.#growArray()
        if (this._capacity !== undefined && this.length > this._capacity) this.popBack()
        if (this._head < this._tail) return this._tail - this._head
        else return this._capacityMask + 1 - (this._head - this._tail)
    }

    /**
     * Add an item to the end of the list.
     * @param item
     */
    pushBack(item: T): number {
        const tail = this._tail
        this._list[tail] = item
        this._tail = (tail + 1) & this._capacityMask
        if (this._tail === this._head) {
            this.#growArray()
        }
        if (this._capacity !== undefined && this.length > this._capacity) {
            this.popFront()
        }
        if (this._head < this._tail) return this._tail - this._head
        else return this._capacityMask + 1 - (this._head - this._tail)
    }

    /**
     * Remove and return the last item on the list.
     * Returns undefined if the list is empty.
     */
    popBack(): T | undefined {
        const tail = this._tail
        if (tail === this._head) return undefined
        const len = this._list.length
        this._tail = (tail - 1 + len) & this._capacityMask
        const item = this._list[this._tail]
        this._list[this._tail] = undefined
        if (this._head < 2 && tail > 10000 && tail <= len >>> 2) this.#shrinkArray()
        return item
    }

    /**
     * Remove and return the first item on the list,
     * Returns undefined if the list is empty.
     */
    popFront(): T | undefined {
        const head = this._head
        if (head === this._tail) return undefined

        const item = this._list[head]
        this._list[head] = undefined

        this._head = (head + 1) & this._capacityMask
        if (head < 2 && this._tail > 10000 && this._tail <= this._list.length >>> 2) this.#shrinkArray()
        return item
    }

    #remove(i: number, size: number): void {
        const len = this._list.length

        let k
        if (i < size / 2) {
            for (k = i; k > 0; k--) {
                this._list[i] = this._list[i = (i - 1 + len) & this._capacityMask]
            }
            this._list[i] = undefined
            this._head = (this._head + 1 + len) & this._capacityMask
        } else {
            for (k = size - 1 - i; k >= 0; k--) {
                this._list[i] = this._list[i = (i + 1 + len) & this._capacityMask]
            }
            this._list[i] = undefined
            this._tail = (this._tail - 1 + len) & this._capacityMask
        }
    }

    /**
     * Remove and return the item at the specified index from the list.
     * Returns undefined if the list is empty.
     * @param index
     */
    removeOne(index: number): T | undefined {
        let i = index
        if (this._head === this._tail) return undefined

        const size = this.length
        if (i >= size || i < -size) return undefined
        if (i < 0) i += size
        i = (this._head + i) & this._capacityMask
        const item = this._list[i] as T
        this.#remove(i, size)
        return item
    }

    removeBy(predicate: (item: T) => boolean): void {
        const mask = this._capacityMask
        let i = this._head
        let val: T | undefined

        // eslint-disable-next-line no-cond-assign
        while ((val = this._list[i]) !== undefined) {
            if (predicate(val)) {
                this.#remove(i, this.length)

                return
            }
            i = (i + 1) & mask
        }
    }

    /**
     * Soft clear - does not reset capacity.
     */
    clear(): void {
        this._list = Array.from({ length: this._list.length })
        this._head = 0
        this._tail = 0
    }

    indexOf(item: T): number {
        let i = this._head
        while (i !== this._tail) {
            if (this._list[i] === item) {
                return (i - this._head) & this._capacityMask
            }
            i = (i + 1) & this._capacityMask
        }

        return -1
    }

    findIndex(predicate: (item: T) => boolean): number {
        let i = this._head
        while (i !== this._tail) {
            if (predicate(this._list[i]!)) {
                return (i - this._head) & this._capacityMask
            }

            i = (i + 1) & this._capacityMask
        }

        return -1
    }

    find(predicate: (item: T) => boolean): T | undefined {
        let i = this._head
        while (i !== this._tail) {
            if (predicate(this._list[i]!)) {
                return this._list[i]
            }

            i = (i + 1) & this._capacityMask
        }

        return undefined
    }

    includes(item: T): boolean {
        // eslint-disable-next-line unicorn/prefer-includes
        return this.indexOf(item) !== -1
    }

    /**
     * Returns true or false whether the list is empty.
     */
    isEmpty(): boolean {
        return this._head === this._tail
    }

    /**
     * Returns an array of all queue items.
     */
    toArray(): T[] {
        return this.#copyArray(false, this.length)
    }

    /**
     * Fills the queue with items from an array
     * For use in the constructor
     * @param array
     * @private
     */
    #fromArray(array: ArrayLike<T>) {
        const length = array.length
        const capacity = _nextPowerOf2(length)

        const list = this._list = new Array(capacity) as (T | undefined)[]
        this._capacityMask = capacity - 1
        this._tail = length

        for (let i = 0; i < length; i++) list[i] = array[i]
    }

    #growArray() {
        if (this._head !== 0) {
            // double array size and copy existing data, head to end, then beginning to tail.
            const newList = this.#copyArray(true, this._list.length << 1)

            this._tail = this._list.length
            this._head = 0

            this._list = newList
        } else {
            this._tail = this._list.length
            this._list.length <<= 1
        }

        this._capacityMask = (this._capacityMask << 1) | 1
    }

    #shrinkArray() {
        this._list.length >>>= 1
        this._capacityMask >>>= 1
    }

    #copyArray(fullCopy: boolean, size: number): T[] {
        const src = this._list
        const capacity = src.length
        const length = this.length
        size = size | length

        // No prealloc requested and the buffer is contiguous
        if (size === length && this._head < this._tail) {
            // Simply do a fast slice copy
            return this._list.slice(this._head, this._tail) as T[]
        }

        const dest = new Array(size)

        let k = 0
        let i
        if (fullCopy || this._head > this._tail) {
            for (i = this._head; i < capacity; i++) dest[k++] = src[i]
            for (i = 0; i < this._tail; i++) dest[k++] = src[i]
        } else {
            for (i = this._head; i < this._tail; i++) dest[k++] = src[i]
        }

        return dest as T[]
    }

    [Symbol.iterator](): Iterator<T> {
        let i = this._head
        return {
            next: (): IteratorResult<T> => {
                if (i === this._tail) return { done: true, value: undefined }
                const item = this._list[i]
                i = (i + 1) & this._capacityMask

                return { done: false, value: item! }
            },
        }
    }
}
