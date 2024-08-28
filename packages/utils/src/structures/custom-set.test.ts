import { describe, expect, it } from 'vitest'

import { CustomSet } from './custom-set.js'

describe('CustomSet', () => {
    const mapper = [
        (key: string) => Number(key),
        (key: number) => key.toString(),
    ] as const

    it('should map keys', () => {
        const set = new CustomSet(...mapper)

        set.add('1')
        set.add('2')
        set.add('3')
        set.delete('2')

        expect(set.has('1')).toBeTruthy()
        expect(set.has('2')).toBeFalsy()
        expect(set.has('3')).toBeTruthy()
        expect([...set.getInternalSet()]).toEqual([1, 3])
    })

    it('should iterate over keys', () => {
        const set = new CustomSet(...mapper)

        set.add('1')
        set.add('2')
        set.add('3')

        const keys: string[] = []
        for (const key of set.keys()) {
            keys.push(key)
        }

        expect(keys).toEqual(['1', '2', '3'])
    })

    it('should implement forEach', () => {
        const set = new CustomSet<string, number>(...mapper)

        set.add('1')
        set.add('2')
        set.add('3')

        const keys: string[] = []
        set.forEach((key, key2) => {
            expect(key).toEqual(key2)
            keys.push(key)
        })

        expect(keys).toEqual(['1', '2', '3'])
    })

    it('should implement size', () => {
        const set = new CustomSet(...mapper)

        set.add('1')
        set.add('2')
        set.add('3')

        expect(set.size).toEqual(3)
    })

    it('should implement clear', () => {
        const set = new CustomSet(...mapper)

        set.add('1')
        set.add('2')
        set.add('3')

        set.clear()

        expect(set.size).toEqual(0)
    })

    it('should implement entries', () => {
        const set = new CustomSet(...mapper)

        set.add('1')
        set.add('2')
        set.add('3')

        const entries: [string, string][] = []
        for (const [key, key2] of set.entries()) {
            expect(key).toEqual(key2)
            entries.push([key, key2])
        }

        expect(entries).toEqual([
            ['1', '1'],
            ['2', '2'],
            ['3', '3'],
        ])
    })

    it('should throw on unsupported methods', () => {
        const set = new CustomSet(...mapper)

        set.add('1')
        set.add('2')
        set.add('3')

        expect(() => set.union()).toThrow('Method not supported.')
        expect(() => set.intersection()).toThrow('Method not supported.')
        expect(() => set.difference()).toThrow('Method not supported.')
        expect(() => set.symmetricDifference()).toThrow('Method not supported.')
        expect(() => set.isSubsetOf()).toThrow('Method not supported.')
        expect(() => set.isSupersetOf()).toThrow('Method not supported.')
        expect(() => set.isDisjointFrom()).toThrow('Method not supported.')
    })
})
