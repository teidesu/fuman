import { describe, expect, it } from 'vitest'

import { Emitter } from './emitter.js'

describe('Emitter', () => {
    it('should emit to 1 listener', () => {
        const emitter = new Emitter<number>()

        const log: number[] = []
        emitter.add((value) => {
            log.push(value)
        })

        emitter.emit(1)
        emitter.emit(2)
        expect(log).toEqual([1, 2])
    })

    it('should emit to 2 listeners', () => {
        const emitter = new Emitter<number>()

        const log: number[] = []
        emitter.add((value) => {
            log.push(value)
        })
        emitter.add((value) => {
            log.push(value * 10)
        })

        emitter.emit(1)
        emitter.emit(2)
        expect(log).toEqual([1, 10, 2, 20])
    })

    it('should emit to 3 listeners', () => {
        const emitter = new Emitter<number>()

        const log: number[] = []
        emitter.add((value) => {
            log.push(value)
        })
        emitter.add((value) => {
            log.push(value * 10)
        })
        emitter.add((value) => {
            log.push(value * 100)
        })

        emitter.emit(1)
        emitter.emit(2)
        expect(log).toEqual([1, 10, 100, 2, 20, 200])
    })

    it('should emit to 4 listeners', () => {
        const emitter = new Emitter<number>()

        const log: number[] = []
        emitter.add((value) => {
            log.push(value)
        })
        emitter.add((value) => {
            log.push(value * 10)
        })
        emitter.add((value) => {
            log.push(value * 100)
        })
        emitter.add((value) => {
            log.push(value * 1000)
        })

        emitter.emit(1)
        emitter.emit(2)
        expect(log).toEqual([1, 10, 100, 1000, 2, 20, 200, 2000])
    })

    it('should emit to 5 listeners', () => {
        const emitter = new Emitter<number>()

        const log: number[] = []
        emitter.add((value) => {
            log.push(value)
        })
        emitter.add((value) => {
            log.push(value * 10)
        })
        emitter.add((value) => {
            log.push(value * 100)
        })
        emitter.add((value) => {
            log.push(value * 1000)
        })
        emitter.add((value) => {
            log.push(value * 10000)
        })

        emitter.emit(1)
        emitter.emit(2)
        expect(log).toEqual([1, 10, 100, 1000, 10000, 2, 20, 200, 2000, 20000])
    })

    it('should emit to 6 listeners', () => {
        const emitter = new Emitter<number>()

        const log: number[] = []
        emitter.add((value) => {
            log.push(value)
        })
        emitter.add((value) => {
            log.push(value * 10)
        })
        emitter.add((value) => {
            log.push(value * 100)
        })
        emitter.add((value) => {
            log.push(value * 1000)
        })
        emitter.add((value) => {
            log.push(value * 10000)
        })
        emitter.add((value) => {
            log.push(value * 100000)
        })
        emitter.add((value) => {
            log.push(value * 1000000)
        })

        emitter.emit(1)
        emitter.emit(2)
        expect(log).toEqual([1, 10, 100, 1000, 10000, 100000, 1000000, 2, 20, 200, 2000, 20000, 200000, 2000000])
    })

    it('should support .once()', () => {
        const emitter = new Emitter<number>()

        const log: number[] = []
        emitter.add((value) => {
            log.push(value)
        })
        emitter.once((value) => {
            log.push(value)
        })

        emitter.emit(1)
        emitter.emit(2)
        expect(log).toEqual([1, 1, 2])
    })

    it('should remove listeners', () => {
        const emitter = new Emitter<number>()

        const log: number[] = []
        const listener = (value: number) => {
            log.push(value)
        }
        emitter.add((value) => {
            log.push(value * 10)
        })
        emitter.add(listener)
        emitter.remove(listener)

        emitter.emit(1)
        expect(log).toEqual([10])
    })

    it('should remove all listeners', () => {
        const emitter = new Emitter<number>()

        const log: number[] = []
        const listener = (value: number) => {
            log.push(value)
        }
        emitter.add(listener)
        emitter.add(listener)
        emitter.remove(listener)
        emitter.remove(listener)

        emitter.emit(1)
        expect(log).toEqual([])
    })

    it('should clear all listeners', () => {
        const emitter = new Emitter<number>()

        const log: number[] = []
        const listener = (value: number) => {
            log.push(value)
        }
        emitter.add(listener)
        emitter.add(listener)

        emitter.clear()

        emitter.emit(1)
        expect(log).toEqual([])
    })

    it('should return the number of listeners', () => {
        const emitter = new Emitter<number>()

        expect(emitter.length).toBe(0)

        const listener = () => {}
        emitter.add(listener)
        emitter.add(listener)

        expect(emitter.length).toBe(2)
    })
})
