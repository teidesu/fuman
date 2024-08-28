import { describe, expect, it } from 'vitest'

import { LruSet } from './lru-set.js'

describe('LruSet', () => {
    it('when 1 item is added, it is in the set', () => {
        const set = new LruSet(2)

        set.add('first')
        expect(set.has('first')).toEqual(true)
    })

    it('when =capacity items are added, they are all in the set', () => {
        const set = new LruSet(2)

        set.add('first')
        set.add('second')

        expect(set.has('first')).toEqual(true)
        expect(set.has('second')).toEqual(true)
    })

    it('when >capacity items are added, only the last <capacity> are in the set', () => {
        const set = new LruSet(2)

        set.add('first')
        set.add('second')
        set.add('third')

        expect(set.has('first')).toEqual(false)
        expect(set.has('second')).toEqual(true)
        expect(set.has('third')).toEqual(true)
    })

    it('when the same added is while not eliminated, it is ignored', () => {
        const set = new LruSet(2)

        set.add('first')
        set.add('second')
        set.add('first')
        set.add('third')

        expect(set.has('first')).toEqual(false)
        expect(set.has('second')).toEqual(true)
        expect(set.has('third')).toEqual(true)
    })

    it('should clear the set', () => {
        const set = new LruSet(2)

        set.add('first')
        set.add('second')
        set.add('third')

        set.clear()

        expect(set.has('first')).toBeFalsy()
        expect(set.has('second')).toBeFalsy()
        expect(set.has('third')).toBeFalsy()
    })
})
