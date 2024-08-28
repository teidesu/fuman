import { describe, expect, it } from 'vitest'

import { Bytes } from './bytes.js'

describe('Bytes', () => {
    describe('alloc', () => {
        it('should allocate a buffer', () => {
            const buf = Bytes.alloc(16)
            expect(buf.capacity).toBe(16)
            expect(buf.available).toBe(0)
        })

        it('should allocate a buffer with a default size', () => {
            const buf = Bytes.alloc()
            expect(buf.capacity).toBe(1024 * 16)
            expect(buf.available).toBe(0)
        })
    })

    describe('from', () => {
        it('should create a buffer from data', () => {
            const buf = Bytes.from(new Uint8Array([1, 2, 3]))
            expect(buf.capacity).toBe(3)
            expect(buf.available).toBe(3)
        })

        it('should use the buffer to back the data', () => {
            const data = new Uint8Array([1, 2, 3])
            const buf = Bytes.from(data)
            data[0] = 4
            expect(buf.result()).toEqual(new Uint8Array([4, 2, 3]))
        })
    })

    describe('growing', async () => {
        it('should grow buffer', async () => {
            const buf = Bytes.alloc(2)
            await buf.write(new Uint8Array([1, 2]))
            await buf.write(new Uint8Array([3, 4]))
            expect(buf.capacity).toBe(4)
            expect(buf.result()).toEqual(new Uint8Array([1, 2, 3, 4]))
        })

        it('should grow buffer by doubling', async () => {
            const buf = Bytes.alloc(2)
            await buf.write(new Uint8Array([1, 2]))
            await buf.write(new Uint8Array([3, 4]))
            await buf.write(new Uint8Array([5, 6]))
            expect(buf.capacity).toBe(8)
            expect(buf.result()).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6]))
        })

        it('should handle large writes', async () => {
            const buf = Bytes.alloc(2)
            const data = new Uint8Array(1024)
            data.fill(1)
            await buf.write(data)
            expect(buf.capacity).toBe(1024)
            expect(buf.result()).toEqual(data)
        })
    })
})
