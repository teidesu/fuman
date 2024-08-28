import { describe, expect, it } from 'vitest'

import { asyncPool, parallelMap } from './pool.js'
import { sleep } from './sleep.js'

describe('asyncPool', () => {
    it('should work with items less than limit', async () => {
        const log: string[] = []

        log.push('start pool')
        await asyncPool([1, 2, 3, 4, 5], async (item, index) => {
            log.push(`start item=${item} idx=${index}`)
            await sleep(10 * index)
            log.push(`end item=${item} idx=${index}`)
        })
        log.push('end pool')

        expect(log).toEqual([
            'start pool',
            'start item=1 idx=0',
            'start item=2 idx=1',
            'start item=3 idx=2',
            'start item=4 idx=3',
            'start item=5 idx=4',
            'end item=1 idx=0',
            'end item=2 idx=1',
            'end item=3 idx=2',
            'end item=4 idx=3',
            'end item=5 idx=4',
            'end pool',
        ])
    })

    it('should work with items above than limit', async () => {
        const log: string[] = []

        log.push('start pool')
        await asyncPool([1, 2, 3, 4, 5], async (item, index) => {
            log.push(`start item=${item} idx=${index}`)
            await sleep(10 * index)
            log.push(`end item=${item} idx=${index}`)
        }, { limit: 2 })
        log.push('end pool')

        expect(log).toEqual([
            'start pool',
            'start item=1 idx=0',
            'start item=2 idx=1',
            'end item=1 idx=0',
            'start item=3 idx=2',
            'end item=2 idx=1',
            'start item=4 idx=3',
            'end item=3 idx=2',
            'start item=5 idx=4',
            'end item=4 idx=3',
            'end item=5 idx=4',
            'end pool',
        ])
    })

    it('should throw and stop on error by default', async () => {
        const log: string[] = []

        log.push('start pool')
        try {
            await asyncPool([1, 2, 3, 4, 5], async (item, index) => {
                log.push(`start item=${item} idx=${index}`)
                await sleep(10 * index)
                log.push(`end item=${item} idx=${index}`)

                if (item === 3) {
                    throw new Error('lol')
                }
            }, { limit: 2 })
            log.push('end pool')
        } catch (err) {
            log.push(`end pool with error: ${err as string}`)
        }

        expect(log).toEqual([
            'start pool',
            'start item=1 idx=0',
            'start item=2 idx=1',
            'end item=1 idx=0',
            'start item=3 idx=2',
            'end item=2 idx=1',
            'start item=4 idx=3',
            'end item=3 idx=2',
            'end pool with error: Error: lol',
        ])
    })

    it('should allow ignoring errors', async () => {
        const log: string[] = []

        log.push('start pool')
        try {
            await asyncPool([1, 2, 3, 4, 5], async (item, index) => {
                log.push(`start item=${item} idx=${index}`)
                await sleep(10 * index)
                log.push(`end item=${item} idx=${index}`)

                if (item === 3) {
                    throw new Error('lol')
                }
            }, { limit: 2, onError: () => 'ignore' })
            log.push('end pool')
        } catch (err) {
            log.push(`end pool with error: ${err as string}`)
        }

        expect(log).toEqual([
            'start pool',
            'start item=1 idx=0',
            'start item=2 idx=1',
            'end item=1 idx=0',
            'start item=3 idx=2',
            'end item=2 idx=1',
            'start item=4 idx=3',
            'end item=3 idx=2',
            'start item=5 idx=4',
            'end item=4 idx=3',
            'end item=5 idx=4',
            'end pool',
        ])
    })

    it('should allow collecting errors', async () => {
        const log: string[] = []

        log.push('start pool')
        try {
            await asyncPool([1, 2, 3, 4, 5], async (item, index) => {
                log.push(`start item=${item} idx=${index}`)
                await sleep(10 * index)
                log.push(`end item=${item} idx=${index}`)

                if (item === 3 || item === 4) {
                    throw new Error('lol')
                }
            }, { limit: 2, onError: () => 'collect' })
            log.push('end pool')
        } catch (err) {
            log.push(`end pool with error: ${err as string}`)
        }

        expect(log).toEqual([
            'start pool',
            'start item=1 idx=0',
            'start item=2 idx=1',
            'end item=1 idx=0',
            'start item=3 idx=2',
            'end item=2 idx=1',
            'start item=4 idx=3',
            'end item=3 idx=2',
            'start item=5 idx=4',
            'end item=4 idx=3',
            'end item=5 idx=4',
            'end pool with error: Error: AggregateError: 2 errors',
        ])
    })
})

describe('parallelMap', () => {
    it('should work', async () => {
        const log: string[] = []

        log.push('start pool')
        const result = await parallelMap([1, 2, 3, 4, 5], async (item, index) => {
            log.push(`start item=${item} idx=${index}`)
            await sleep(10 * index)
            log.push(`end item=${item} idx=${index}`)
            return item
        })
        log.push('end pool')

        expect(log).toEqual([
            'start pool',
            'start item=1 idx=0',
            'start item=2 idx=1',
            'start item=3 idx=2',
            'start item=4 idx=3',
            'start item=5 idx=4',
            'end item=1 idx=0',
            'end item=2 idx=1',
            'end item=3 idx=2',
            'end item=4 idx=3',
            'end item=5 idx=4',
            'end pool',
        ])

        expect(result).toEqual([1, 2, 3, 4, 5])
    })
})
