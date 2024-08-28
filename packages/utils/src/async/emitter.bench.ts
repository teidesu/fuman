/* eslint-disable ts/no-unsafe-argument */
import EventEmitter from 'node:events'

import { bench, describe } from 'vitest'

import { Emitter } from './emitter.js'

describe('1 listener', () => {
    bench('Emitter', () => {
        const emitter = new Emitter<number>()

        const log: number[] = []
        emitter.add((value) => {
            log.push(value)
        })
        for (let i = 0; i < 1000; i++) {
            emitter.emit(i)
        }
    })

    bench('EventEmitter', () => {
        const emitter = new EventEmitter()

        const log: number[] = []
        emitter.on('data', (value) => {
            log.push(value)
        })
        for (let i = 0; i < 1000; i++) {
            emitter.emit('data', i)
        }
    })

    bench('EventTarget', () => {
        const emitter = new EventTarget()

        const log: number[] = []
        emitter.addEventListener('data', (event) => {
            log.push((event as CustomEvent).detail)
        })
        for (let i = 0; i < 1000; i++) {
            emitter.dispatchEvent(new CustomEvent('data', { detail: i }))
        }
    })
})

describe('2 listeners', () => {
    bench('Emitter', () => {
        const emitter = new Emitter<number>()

        const log: number[] = []
        emitter.add((value) => {
            log.push(value)
        })
        emitter.add((value) => {
            log.push(value)
        })
        for (let i = 0; i < 1000; i++) {
            emitter.emit(i)
        }
    })

    bench('EventEmitter', () => {
        const emitter = new EventEmitter()

        const log: number[] = []
        emitter.on('data', (value) => {
            log.push(value)
        })
        emitter.on('data', (value) => {
            log.push(value)
        })
        for (let i = 0; i < 1000; i++) {
            emitter.emit('data', i)
        }
    })

    bench('EventTarget', () => {
        const emitter = new EventTarget()

        const log: number[] = []
        emitter.addEventListener('data', (event) => {
            log.push((event as CustomEvent).detail)
        })
        emitter.addEventListener('data', (event) => {
            log.push((event as CustomEvent).detail)
        })
        for (let i = 0; i < 1000; i++) {
            emitter.dispatchEvent(new CustomEvent('data', { detail: i }))
        }
    })
})
