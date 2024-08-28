import { describe, expect, it, vi } from 'vitest'

import { Bytes } from '../../bytes.js'
import { PartialReadError } from '../../errors.js'

import * as strings from './strings.js'

describe('read/async/strings', () => {
    describe('exactly', () => {
        it('should read exactly the given number of bytes', async () => {
            const buffer = Bytes.from(new Uint8Array([104, 101, 108, 108, 111]))

            expect(await strings.exactly(buffer, 5)).toStrictEqual(new Uint8Array([104, 101, 108, 108, 111]))
            expect(buffer.available).toBe(0)
        })

        it('should throw if reading past the end', async () => {
            const buffer = Bytes.from(new Uint8Array([104, 101, 108, 108, 111]))

            await expect(strings.exactly(buffer, 6)).rejects.toThrow(PartialReadError)
        })

        it('should truncate if onEof is set to truncate', async () => {
            const buffer = Bytes.from(new Uint8Array([104, 101, 108, 108, 111]))

            expect(await strings.exactly(buffer, 100, 'truncate')).toStrictEqual(new Uint8Array([104, 101, 108, 108, 111]))
            expect(buffer.available).toBe(0)
        })
    })

    describe('untilEnd', () => {
        it('should read until the end', async () => {
            const buffer = Bytes.from(new Uint8Array([104, 101, 108, 108, 111]))

            expect(await strings.untilEnd(buffer)).toStrictEqual(new Uint8Array([104, 101, 108, 108, 111]))
            expect(buffer.available).toBe(0)
        })

        it('should read in chunks', async () => {
            const buffer = Bytes.from(new Uint8Array([104, 101, 108, 108, 111]))

            const spy = vi.spyOn(buffer, 'read')

            expect(await strings.untilEnd(buffer, 2)).toStrictEqual(new Uint8Array([104, 101, 108, 108, 111]))
            expect(buffer.available).toBe(0)
            expect(spy).toHaveBeenCalledTimes(4)
        })
    })
})
