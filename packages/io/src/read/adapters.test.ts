import { describe, expect, it } from 'vitest'

import { Bytes } from '../bytes.js'

import { fumanReadableToWeb, fumanSyncReadableToAsync, webReadableToFuman } from './adapters.js'

describe('read/adapters', () => {
    describe('fumanSyncReadableToAsync', () => {
        it('should return an IReadable', async () => {
            const sync = Bytes.from(new Uint8Array(16))
            const readable = fumanSyncReadableToAsync(sync)

            expect(await readable.read(new Uint8Array(10))).toBe(10)
            expect(await readable.read(new Uint8Array(10))).toBe(6)
            expect(await readable.read(new Uint8Array(10))).toBe(0)
        })
    })

    describe('webReadableToFuman', () => {
        it('should read from byte streams', async () => {
            let state = 0
            const readable = new ReadableStream({
                type: 'bytes',
                pull(controller) {
                    switch (state) {
                        case 0:
                            state = 1
                            controller.enqueue(new Uint8Array([1, 2, 3]))
                            break
                        case 1:
                            state = 2
                            controller.enqueue(new Uint8Array([4, 5, 6]))
                            break
                        default:
                            controller.close()
                            controller.byobRequest?.respond(0)
                    }
                },
            })

            const reader = webReadableToFuman(readable)
            const buf = new Uint8Array(16)

            expect(await reader.read(buf)).toBe(3)
            expect(buf.slice(0, 3)).toEqual(new Uint8Array([1, 2, 3]))

            expect(await reader.read(buf)).toBe(3)
            expect(buf.slice(0, 3)).toEqual(new Uint8Array([4, 5, 6]))

            expect(await reader.read(buf)).toBe(0)
        })

        it('should read from normal streams', async () => {
            let state = 0
            const readable = new ReadableStream<Uint8Array>({
                pull(controller) {
                    switch (state) {
                        case 0:
                            state = 1
                            controller.enqueue(new Uint8Array([1, 2, 3]))
                            break
                        case 1:
                            state = 2
                            controller.enqueue(new Uint8Array([4, 5, 6]))
                            break
                        default:
                            controller.close()
                    }
                },
            })

            const reader = webReadableToFuman(readable)
            const buf = new Uint8Array(16)

            expect(await reader.read(buf)).toBe(3)
            expect(buf.slice(0, 3)).toEqual(new Uint8Array([1, 2, 3]))

            expect(await reader.read(buf)).toBe(3)
            expect(buf.slice(0, 3)).toEqual(new Uint8Array([4, 5, 6]))

            expect(await reader.read(buf)).toBe(0)
        })

        it('should handle large chunks in normal streams', async () => {
            const readable = new ReadableStream<Uint8Array>({
                start(controller) {
                    controller.enqueue(new Uint8Array(64))
                    controller.close()
                },
            })

            const reader = webReadableToFuman(readable)
            const buf = new Uint8Array(20)

            expect(await reader.read(buf)).toBe(20)
            expect(await reader.read(buf)).toBe(20)
            expect(await reader.read(buf)).toBe(20)
            expect(await reader.read(buf)).toBe(4)
            expect(await reader.read(buf)).toBe(0)
        })

        it('should properly close the reader', async () => {
            let state = 0
            let cancelled = false
            const readable = new ReadableStream<Uint8Array>({
                pull(controller) {
                    switch (state) {
                        case 0:
                            state = 1
                            controller.enqueue(new Uint8Array([1, 2, 3]))
                            break
                        case 1:
                            state = 2
                            controller.enqueue(new Uint8Array([4, 5, 6]))
                            break
                        default:
                            controller.close()
                    }
                },
                cancel() {
                    cancelled = true
                },
            })

            const reader = webReadableToFuman(readable)
            const buf = new Uint8Array(16)

            expect(await reader.read(buf)).toBe(3)
            reader.close()
            expect(await reader.read(buf)).toBe(0)
            expect(cancelled).toBe(true)
        })
    })

    describe('fumanReadableToWeb', () => {
        it('should convert a readable stream to a web readable stream', async () => {
            const readable = Bytes.from(new Uint8Array([1, 2, 3, 4, 5, 6]))
            const webReadable = fumanReadableToWeb(readable)

            const reader = webReadable.getReader()

            expect(await reader.read()).toEqual({ value: new Uint8Array([1, 2, 3, 4, 5, 6]), done: false })
            expect(await reader.read()).toEqual({ done: true, value: undefined })
        })

        it('should convert to a byob reader', async () => {
            const readable = Bytes.from(new Uint8Array([1, 2, 3, 4, 5, 6]))
            const webReadable = fumanReadableToWeb(readable)

            const reader = webReadable.getReader({ mode: 'byob' })
            let buf = new Uint8Array(3)

            expect(await reader.read(buf)).toEqual({ value: new Uint8Array([1, 2, 3]), done: false })
            buf = new Uint8Array(3)
            expect(await reader.read(buf)).toEqual({ value: new Uint8Array([4, 5, 6]), done: false })
            buf = new Uint8Array(3)
            expect(await reader.read(buf)).toEqual({ done: true, value: new Uint8Array(0) })
        })
    })
})
