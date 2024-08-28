import { describe, expect, it } from 'vitest'

import { Bytes } from '../bytes.js'

import { fumanSyncWritableToAsync, fumanWritableToWeb, webWritableToFuman } from './adapters.js'

describe('adapters', () => {
    describe('fumanSyncWritableToAsync', () => {
        it('should convert ISyncWritable to IWritable', async () => {
            const sync = Bytes.alloc()
            const writable = fumanSyncWritableToAsync(sync)

            await writable.write(new Uint8Array([1, 2, 3]))
            expect(sync.available).toBe(3)
            expect(sync.result()).toEqual(new Uint8Array([1, 2, 3]))
        })
    })

    describe('webWritableToFuman', () => {
        it('should convert web stream to IWritable', async () => {
            const written = Bytes.alloc()

            const web = new WritableStream({
                write(chunk) {
                    written.writeSync(chunk.length).set(chunk)
                },
            })

            const fuman = webWritableToFuman(web)

            await fuman.write(new Uint8Array([1, 2, 3]))

            expect(written.available).toBe(3)
            expect(written.result()).toEqual(new Uint8Array([1, 2, 3]))
        })
    })

    describe('fumanWritableToWeb', () => {
        it('should convert IWritable to web stream', async () => {
            const written = Bytes.alloc()

            const web = fumanWritableToWeb(written)
            const writer = web.getWriter()

            await writer.write(new Uint8Array([1, 2, 3]))

            expect(written.available).toBe(3)
            expect(written.result()).toEqual(new Uint8Array([1, 2, 3]))
        })
    })
})
