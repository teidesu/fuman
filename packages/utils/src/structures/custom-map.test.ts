import { describe, expect, it } from 'vitest'

import { CustomMap } from './custom-map.js'

describe('CustomMap', () => {
    const mapper = [
        (key: string) => Number(key),
        (key: number) => key.toString(),
    ] as const

    it('should map keys', () => {
        const map = new CustomMap(...mapper)

        map.set('1', 1)
        map.set('2', 2)
        map.set('3', 3)
        map.delete('2')

        expect(map.get('1')).toEqual(1)
        expect(map.get('2')).toBeUndefined()
        expect(map.get('3')).toEqual(3)
        expect(Object.fromEntries(map.getInternalMap().entries())).toEqual({
            1: 1,
            3: 3,
        })
    })

    it('should iterate over keys', () => {
        const map = new CustomMap(...mapper)

        map.set('1', 1)
        map.set('2', 2)
        map.set('3', 3)

        const keys: string[] = []
        for (const key of map.keys()) {
            keys.push(key)
        }

        expect(keys).toEqual(['1', '2', '3'])
    })

    it('should iterate over values', () => {
        const map = new CustomMap<string, number, number>(...mapper)

        map.set('1', 1)
        map.set('2', 2)
        map.set('3', 3)

        const values: number[] = []
        for (const value of map.values()) {
            values.push(value)
        }

        expect(values).toEqual([1, 2, 3])
    })

    it('should iterate over entries', () => {
        const map = new CustomMap<string, number, number>(...mapper)

        map.set('1', 1)
        map.set('2', 2)
        map.set('3', 3)

        const entries: [string, number][] = []
        for (const [key, value] of map) {
            entries.push([key, value])
        }

        expect(entries).toEqual([
            ['1', 1],
            ['2', 2],
            ['3', 3],
        ])
    })

    it('should implement forEach', () => {
        const map = new CustomMap<string, number, number>(...mapper)

        map.set('1', 1)
        map.set('2', 2)
        map.set('3', 3)

        const entries: [string, number][] = []
        map.forEach((value, key) => {
            entries.push([key, value])
        })

        expect(entries).toEqual([
            ['1', 1],
            ['2', 2],
            ['3', 3],
        ])
    })

    it('should implement size', () => {
        const map = new CustomMap(...mapper)

        map.set('1', 1)
        map.set('2', 2)
        map.set('3', 3)

        expect(map.size).toEqual(3)
    })

    it('should implement clear', () => {
        const map = new CustomMap(...mapper)

        map.set('1', 1)
        map.set('2', 2)
        map.set('3', 3)

        map.clear()

        expect(map.size).toEqual(0)
    })
})
