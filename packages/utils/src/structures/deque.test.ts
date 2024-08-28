/* eslint-disable dot-notation */
import { describe, expect, it } from 'vitest'

import { Deque } from './deque.js'

function setupWrappedDeque() {
    const a = new Deque([1, 2, 3, 4, 5, 6, 7])

    a.popFront()
    a.popFront()
    a.pushBack(8)
    a.pushBack(9)

    // eslint-disable-next-line no-sparse-arrays
    expect(a['_list']).toEqual([9, , 3, 4, 5, 6, 7, 8])

    return a
}

describe('Deque.prototype.constructor', () => {
    it('should take no argument', () => {
        const a = new Deque()
        expect(a['_capacityMask']).toEqual(3)
        expect(a['_list'].length).toEqual(4)
        expect(a.length).toEqual(0)
    })

    it('should take array argument', () => {
        const a = new Deque([1, 2, 3, 4])
        const b = new Deque([])

        expect(a.length).toBeGreaterThanOrEqual(4)
        expect(a.toArray()).toEqual([1, 2, 3, 4])
        expect(b.length).toEqual(0)
        expect(b.toArray()).toEqual([])
    })

    it('should handle a high volume with no out of memory exception', { timeout: 20000 }, () => {
        const deque = new Deque()
        let l = 250000

        while (--l) {
            deque.pushBack(l)
            deque.pushFront(l)
        }

        l = 125000
        while (--l) {
            const a = deque.popFront()
            deque.popBack()
            deque.popFront()
            deque.pushBack(a)
            deque.popFront()
            deque.popFront()
        }

        deque.clear()
        l = 100000

        while (--l) {
            deque.pushBack(l)
        }

        l = 100000
        while (--l) {
            deque.popFront()
            deque.popFront()
            deque.popFront()
            if (l === 25000) deque.clear()
            deque.popBack()
            deque.popBack()
            deque.popBack()
        }
    })
})

describe('Deque.prototype.toArray', () => {
    it('should return an array', () => {
        const a = new Deque([1, 2, 3, 4])
        expect(a.toArray()).toEqual([1, 2, 3, 4])
    })
})

describe('Deque.prototype.pushBack', () => {
    it('Should accept undefined values', () => {
        const a = new Deque()
        a.pushBack(undefined)
        expect(a.length).toEqual(1)
    })

    it('Should add falsey elements (except undefined)', () => {
        const a = new Deque()
        // var before = a.length;
        let ret = a.pushBack(0)
        expect(ret).toEqual(1)
        expect(a.length).toEqual(1)
        expect(a.at(0)).toEqual(0)

        ret = a.pushBack('')
        expect(ret).toEqual(2)
        expect(a.length).toEqual(2)
        expect(a.at(1)).toEqual('')

        ret = a.pushBack(null)
        expect(ret).toEqual(3)
        expect(a.length).toEqual(3)
        expect(a.at(2)).toEqual(null)
    })

    it('Should add single argument - plenty of capacity', () => {
        const a = new Deque([1, 2, 3, 4, 5])
        expect(a['_list'].length - a.length).toBeGreaterThan(1)

        const before = a.length
        const ret = a.pushBack(1)
        expect(ret).toEqual(before + 1)
        expect(a.length).toEqual(ret)
        expect(ret).toEqual(6)
        expect(a.toArray()).toEqual([1, 2, 3, 4, 5, 1])
    })

    it('Should add single argument - exact capacity', () => {
        const a = new Deque([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
        expect(a['_list'].length - a.length).toBe(1)

        const before = a.length
        const ret = a.pushBack(1)
        expect(ret).toEqual(before + 1)
        expect(a.length).toEqual(ret)
        expect(ret).toEqual(16)
        expect(a.toArray()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 1])
    })

    it('Should add single argument - over capacity', () => {
        const a = new Deque([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])
        expect(a['_list'].length / a.length).toBe(2)

        const before = a.length
        const ret = a.pushBack(1)
        expect(ret).toEqual(before + 1)
        expect(a.length).toEqual(ret)
        expect(ret).toEqual(17)
        expect(a.toArray()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 1])
    })

    it('should respect capacity', () => {
        const a = new Deque([1, 2, 3], { capacity: 3 })
        a.pushBack(4)

        expect(a.length).toEqual(3)
        expect(a.at(0)).toEqual(2)
        expect(a.at(1)).toEqual(3)
        expect(a.at(2)).toEqual(4)
    })
})

describe('Deque.prototype.pushFront', () => {
    it('Should accept undefined values', () => {
        const a = new Deque()
        a.pushFront(undefined)
        expect(a.length).toEqual(1)
    })

    it('Should unshift falsey elements (except undefined)', () => {
        const a = new Deque()
        let ret = a.pushFront(0)
        expect(ret).toEqual(1)
        expect(a.length).toEqual(1)
        expect(a.at(0)).toEqual(0)

        ret = a.pushFront('')
        expect(ret).toEqual(2)
        expect(a.length).toEqual(2)
        expect(a.at(0)).toEqual('')

        ret = a.pushFront(null)
        expect(ret).toEqual(3)
        expect(a.length).toEqual(3)
        expect(a.at(0)).toEqual(null)
    })

    it('Should add single argument - plenty of capacity', () => {
        const a = new Deque([1, 2, 3, 4, 5])
        // assert(a._list.length - a.length > 1)
        expect(a['_list'].length - a.length).toBeGreaterThan(1)

        const before = a.length
        const ret = a.pushFront(1)
        expect(ret).toEqual(before + 1)
        expect(a.length).toEqual(ret)
        expect(ret).toEqual(6)
        expect(a.toArray()).toEqual([1, 1, 2, 3, 4, 5])
    })

    it('Should add single argument - exact capacity', () => {
        const a = new Deque([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
        // assert(a._list.length - a.length === 1)
        expect(a['_list'].length - a.length).toBe(1)

        const ret = a.pushFront(1)
        expect(ret).toEqual(16)
        expect(a.length).toEqual(16)
        expect(a.toArray()).toEqual([1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
    })

    it('Should add single argument - over capacity', () => {
        const a = new Deque([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])
        expect(a['_list'].length / a.length).toBe(2)

        const ret = a.pushFront(1)
        expect(ret).toEqual(17)
        expect(a.length).toEqual(17)
        expect(a.toArray()).toEqual([1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])
    })

    it('should respect capacity', () => {
        const a = new Deque([1, 2, 3], { capacity: 3 })
        a.pushFront(0)

        expect(a.length).toEqual(3)
        expect(a.at(0)).toEqual(0)
        expect(a.at(1)).toEqual(1)
        expect(a.at(2)).toEqual(2)
    })
})

describe('Deque.prototype.popBack', () => {
    it('Should return undefined when empty Deque', () => {
        const a = new Deque()

        expect(a.length).toEqual(0)
        expect(a.popBack()).toBeUndefined()
        expect(a.popBack()).toBeUndefined()
        expect(a.length).toEqual(0)
    })

    it('Should return the item at the back of the Deque', () => {
        const a = new Deque([1, 2, 3, 4, 5, 6, 7, 8, 9])
        const b = [1, 2, 3, 4, 5, 6, 7, 8, 9]

        expect(a.popBack()).toEqual(9)
        expect(a.popBack()).toEqual(8)

        b.pop()
        b.pop()
        expect(a.toArray()).toEqual(b)

        a.pushFront(5)
        a.pushFront(4)
        a.pushFront(3)
        a.pushFront(2)
        a.pushFront(1)
        a.pushBack(1)
        a.pushBack(2)
        a.pushBack(3)
        a.pushBack(4)
        a.pushBack(5)
        a.pushFront(3)
        a.pushFront(2)
        a.pushFront(1)
        a.popBack()
        b.unshift(1, 2, 3, 4, 5)
        b.push(1, 2, 3, 4, 5)
        b.unshift(1, 2, 3)
        b.pop()

        expect(a.toArray()).toEqual(b)
        expect(a.popBack()).toEqual(b.pop())
        expect(a.toArray()).toEqual(b)
    })
})

describe('Deque.prototype.popFront', () => {
    it('Should return undefined when empty Deque', () => {
        const a = new Deque()

        expect(a.length).toEqual(0)
        expect(a.popFront()).toBeUndefined()
        expect(a.popFront()).toBeUndefined()
        expect(a.length).toEqual(0)
    })

    it('Should return the item at the front of the Deque', () => {
        const a = new Deque([1, 2, 3, 4, 5, 6, 7, 8, 9])
        const b = [1, 2, 3, 4, 5, 6, 7, 8, 9]

        expect(a.popFront()).toEqual(1)
        expect(a.popFront()).toEqual(2)

        b.shift()
        b.shift()
        expect(a.toArray()).toEqual(b)

        a.pushFront(5)
        a.pushFront(4)
        a.pushFront(3)
        a.pushFront(2)
        a.pushFront(1)
        a.pushBack(1)
        a.pushBack(2)
        a.pushBack(3)
        a.pushBack(4)
        a.pushBack(5)
        a.pushFront(3)
        a.pushFront(2)
        a.pushFront(1)
        a.popFront()
        b.unshift(1, 2, 3, 4, 5)
        b.push(1, 2, 3, 4, 5)
        b.unshift(1, 2, 3)
        b.shift()

        expect(a.toArray()).toEqual(b)
        expect(a.popFront()).toEqual(b.shift())
        expect(a.toArray()).toEqual(b)
    })
})

describe('Deque.prototype.at', () => {
    it('should return undefined on nonsensical argument', () => {
        const a = new Deque([1, 2, 3, 4])

        expect(a.at(-5)).toBeUndefined()
        expect(a.at(-100)).toBeUndefined()
        expect(a.at(Number.NaN)).toBeUndefined()
        expect(a.at(Infinity)).toBeUndefined()
        expect(a.at(-Infinity)).toBeUndefined()
        expect(a.at(1.5)).toBeUndefined()
        expect(a.at(4)).toBeUndefined()
    })

    it('should support positive indexing', () => {
        const a = new Deque([1, 2, 3, 4])

        expect(a.at(0)).toEqual(1)
        expect(a.at(1)).toEqual(2)
        expect(a.at(2)).toEqual(3)
        expect(a.at(3)).toEqual(4)
    })

    it('should support negative indexing', () => {
        const a = new Deque([1, 2, 3, 4])

        expect(a.at(-1)).toEqual(4)
        expect(a.at(-2)).toEqual(3)
        expect(a.at(-3)).toEqual(2)
        expect(a.at(-4)).toEqual(1)
    })
})

describe('Deque.prototype.isEmpty', () => {
    it('should return true on empty Deque', () => {
        const a = new Deque()
        expect(a.isEmpty()).toBe(true)
    })

    it('should return false on Deque with items', () => {
        const a = new Deque([1])
        expect(a.isEmpty()).toBe(false)
    })
})

describe('Deque.prototype.peekFront', () => {
    it('Should return undefined when queue is empty', () => {
        const a = new Deque()

        expect(a.length).toEqual(0)
        expect(a.peekFront()).toBeUndefined()
        expect(a.peekFront()).toBeUndefined()
        expect(a.length).toEqual(0)
    })

    it('should return the item at the front of the Deque', () => {
        const a = new Deque([1, 2, 3, 4, 5, 6, 7, 8, 9])
        expect(a.peekFront()).toEqual(1)

        let l = 5
        while (l--) a.popBack()

        expect(a.toArray()).toEqual([1, 2, 3, 4])
        expect(a.peekFront()).toEqual(1)
    })
})

describe('Deque.prototype.peekBack', () => {
    it('Should return undefined when queue is empty', () => {
        const a = new Deque()

        expect(a.length).toEqual(0)
        expect(a.peekBack()).toBeUndefined()
        expect(a.peekBack()).toBeUndefined()
        expect(a.length).toEqual(0)
    })

    it('should return the item at the back of the Deque', () => {
        const a = new Deque([1, 2, 3, 4, 5, 6, 7, 8, 9])
        expect(a.peekBack()).toEqual(9)

        let l = 5
        while (l--) a.popBack()

        expect(a.toArray()).toEqual([1, 2, 3, 4])
        expect(a.peekBack()).toEqual(4)
    })
})

describe('Deque.prototype.clear', () => {
    it('should clear the Deque', () => {
        const a = new Deque([1, 2, 3, 4])
        expect(a.length).toEqual(4)

        a.clear()
        expect(a.isEmpty()).toBe(true)
        expect(a.length).toEqual(0)
    })
})

describe('Deque.prototype.removeOne', () => {
    it('Should return undefined when empty Deque', () => {
        const a = new Deque()

        expect(a.length).toEqual(0)
        expect(a.removeOne(1)).toBeUndefined()
        expect(a.length).toEqual(0)
    })

    it('Should return undefined when index is invalid', () => {
        const b = new Deque()
        b.pushBack('foobar')
        b.pushBack('foobaz')

        expect(b.removeOne(-4)).toBeUndefined()
        expect(b.removeOne(3)).toBeUndefined()
        expect(b.length).toEqual(2)
    })

    it('Should remove from first half', () => {
        const b = new Deque([1, 2, 3, 4, 5, 6, 7, 8])

        expect(b.removeOne(2)).toEqual(3)
        expect(b.toArray()).toEqual([1, 2, 4, 5, 6, 7, 8])
    })

    it('Should remove from second half', () => {
        const b = new Deque([1, 2, 3, 4, 5, 6, 7, 8])

        expect(b.removeOne(5)).toEqual(6)
        expect(b.removeOne(-1)).toEqual(8)
        expect(b.toArray()).toEqual([1, 2, 3, 4, 5, 7])
    })
})

describe('Deque.prototype.removeBy', () => {
    it('should remove items', () => {
        const b = new Deque([1, 2, 3, 4, 5, 6, 7, 8])

        b.removeBy(item => item > 5)
        expect(b.toArray()).toEqual([1, 2, 3, 4, 5, 7, 8])

        b.removeBy(item => item < 5)
        expect(b.toArray()).toEqual([2, 3, 4, 5, 7, 8])

        b.removeBy(item => item === 5)
        expect(b.toArray()).toEqual([2, 3, 4, 7, 8])
    })

    it('should remove nothing', () => {
        const b = new Deque([1, 2, 3, 4, 5, 6, 7, 8])

        b.removeBy(item => item > 10)
        expect(b.toArray()).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    })
})

describe('Deque.prototype[Symbol.iterator]', () => {
    it('should iterate over the items', () => {
        const a = new Deque([1, 2, 3, 4])
        const b = [1, 2, 3, 4]

        for (const item of a) {
            expect(item).toEqual(b.shift())
        }

        expect(b.length).toEqual(0)
    })
})

describe('Deque.prototype.indexOf', () => {
    it('should return the index of an item', () => {
        const a = new Deque([1, 2, 3, 4])

        expect(a.indexOf(1)).toEqual(0)
        expect(a.indexOf(2)).toEqual(1)
        expect(a.indexOf(3)).toEqual(2)
        expect(a.indexOf(4)).toEqual(3)
        expect(a.indexOf(5)).toEqual(-1)
    })

    it('should work with wrapping', () => {
        const a = setupWrappedDeque()

        expect(a.indexOf(3)).toEqual(0)
        expect(a.indexOf(4)).toEqual(1)
        expect(a.indexOf(5)).toEqual(2)
        expect(a.indexOf(6)).toEqual(3)
        expect(a.indexOf(7)).toEqual(4)
        expect(a.indexOf(8)).toEqual(5)
        expect(a.indexOf(9)).toEqual(6)
    })
})

describe('Deque.prototype.findIndex', () => {
    it('should return the index of an item', () => {
        const a = new Deque([1, 2, 3, 4])

        expect(a.findIndex(item => item === 1)).toEqual(0)
        expect(a.findIndex(item => item === 2)).toEqual(1)
        expect(a.findIndex(item => item === 3)).toEqual(2)
        expect(a.findIndex(item => item === 4)).toEqual(3)
        expect(a.findIndex(item => item === 5)).toEqual(-1)
    })

    it('should work with wrapping', () => {
        const a = setupWrappedDeque()

        expect(a.findIndex(item => item === 3)).toEqual(0)
        expect(a.findIndex(item => item === 4)).toEqual(1)
        expect(a.findIndex(item => item === 5)).toEqual(2)
        expect(a.findIndex(item => item === 6)).toEqual(3)
        expect(a.findIndex(item => item === 7)).toEqual(4)
        expect(a.findIndex(item => item === 8)).toEqual(5)
        expect(a.findIndex(item => item === 9)).toEqual(6)
    })
})

describe('Deque.prototype.find', () => {
    it('should return the first item that matches', () => {
        const a = new Deque([1, 2, 3, 4])

        expect(a.find(item => item === 1)).toEqual(1)
        expect(a.find(item => item === 2)).toEqual(2)
        expect(a.find(item => item === 3)).toEqual(3)
        expect(a.find(item => item === 4)).toEqual(4)
        expect(a.find(item => item === 5)).toBeUndefined()
    })

    it('should work with wrapping', () => {
        const a = setupWrappedDeque()

        expect(a.find(item => item === 3)).toEqual(3)
        expect(a.find(item => item === 4)).toEqual(4)
        expect(a.find(item => item === 5)).toEqual(5)
        expect(a.find(item => item === 6)).toEqual(6)
        expect(a.find(item => item === 7)).toEqual(7)
        expect(a.find(item => item === 8)).toEqual(8)
        expect(a.find(item => item === 9)).toEqual(9)
    })
})

describe('Deque.prototype.includes', () => {
    it('should return true if the item is in the list', () => {
        const a = new Deque([1, 2, 3, 4])

        expect(a.includes(1)).toBeTruthy()
        expect(a.includes(2)).toBeTruthy()
        expect(a.includes(3)).toBeTruthy()
        expect(a.includes(4)).toBeTruthy()
        expect(a.includes(5)).toBeFalsy()
    })

    it('should work with wrapping', () => {
        const a = setupWrappedDeque()

        expect(a.includes(3)).toBeTruthy()
        expect(a.includes(4)).toBeTruthy()
        expect(a.includes(5)).toBeTruthy()
        expect(a.includes(6)).toBeTruthy()
        expect(a.includes(7)).toBeTruthy()
        expect(a.includes(8)).toBeTruthy()
        expect(a.includes(9)).toBeTruthy()
    })
})
