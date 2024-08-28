import { describe, expect, it } from 'vitest'

import { Bytes } from '../bytes.js'

import { pipe } from './pipe.js'

describe('write/pipe', () => {
    it('should write from an IReadable', async () => {
        const data = new Uint8Array(1024 * 64)
        data.fill(1)

        const into = Bytes.alloc()
        await pipe(into, Bytes.from(data))

        expect(into.result()).toEqual(data)
    })
})
