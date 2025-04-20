import { describe, expect, it, vi } from 'vitest'

import { Bytes } from './bytes.js'
import { ReaderWithFinal } from './reader-with-final.js'

describe('ReaderWithFinal', () => {
  it('should work if the data more than internalBufferSize', async () => {
    const bytes = Bytes.from(new Uint8Array([1, 2, 3, 4, 5]))
    const bytesRead = vi.spyOn(bytes, 'read')

    const readable = new ReaderWithFinal(bytes, {
      internalBufferSize: 2,
    })

    const buf = new Uint8Array(10)
    let res = await readable.readWithFinal(buf)

    expect(res).toEqual({ nread: 2, final: false })
    expect(buf).toEqual(new Uint8Array([1, 2, 0, 0, 0, 0, 0, 0, 0, 0]))
    expect(bytesRead).toHaveBeenCalledTimes(2)

    bytesRead.mockClear()

    res = await readable.readWithFinal(buf)

    expect(res).toEqual({ nread: 2, final: false })
    expect(buf).toEqual(new Uint8Array([3, 4, 0, 0, 0, 0, 0, 0, 0, 0]))
    expect(bytesRead).toHaveBeenCalledTimes(1)

    bytesRead.mockClear()

    res = await readable.readWithFinal(buf)

    expect(res).toEqual({ nread: 1, final: true })
    expect(buf).toEqual(new Uint8Array([5, 4, 0, 0, 0, 0, 0, 0, 0, 0])) // 4 is from the previous read
    expect(bytesRead).toHaveBeenCalledTimes(1)

    expect(await readable.readWithFinal(buf)).toEqual({ nread: 0, final: true })
  })

  it('should work if the data less than internalBufferSize', async () => {
    const bytes = Bytes.from(new Uint8Array([1, 2, 3, 4, 5]))
    const bytesRead = vi.spyOn(bytes, 'read')

    const readable = new ReaderWithFinal(bytes, {
      internalBufferSize: 10,
    })

    const buf = new Uint8Array(10)
    const res = await readable.readWithFinal(buf)

    expect(res).toEqual({ nread: 5, final: true })
    expect(buf).toEqual(new Uint8Array([1, 2, 3, 4, 5, 0, 0, 0, 0, 0]))
    expect(bytesRead).toHaveBeenCalledTimes(2)

    expect(await readable.readWithFinal(buf)).toEqual({ nread: 0, final: true })
  })

  it('should work if the buferr is less than internalBufferSize', async () => {
    const bytes = Bytes.from(new Uint8Array([1, 2, 3, 4, 5]))
    const bytesRead = vi.spyOn(bytes, 'read')

    const readable = new ReaderWithFinal(bytes, {
      internalBufferSize: 10,
    })

    const buf = new Uint8Array(2)
    let res = await readable.readWithFinal(buf)

    expect(res).toEqual({ nread: 2, final: false })
    expect(buf).toEqual(new Uint8Array([1, 2]))
    expect(bytesRead).toHaveBeenCalledTimes(1)

    bytesRead.mockClear()

    res = await readable.readWithFinal(buf)

    expect(res).toEqual({ nread: 2, final: false })
    expect(buf).toEqual(new Uint8Array([3, 4]))
    expect(bytesRead).toHaveBeenCalledTimes(0)

    bytesRead.mockClear()

    res = await readable.readWithFinal(buf)

    expect(res).toEqual({ nread: 1, final: true })
    expect(buf).toEqual(new Uint8Array([5, 4])) // 4 is from the previous read
    expect(bytesRead).toHaveBeenCalledTimes(1)

    expect(await readable.readWithFinal(buf)).toEqual({ nread: 0, final: true })
  })
})
