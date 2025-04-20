import { describe, expect, it } from 'vitest'

import { toDataView, view } from './misc.js'

describe('toDataView', () => {
  it('should convert a buffer to a DataView', () => {
    const buf = new Uint8Array([1, 2, 3])
    const dv = toDataView(buf)

    expect(dv.getUint8(0)).toBe(1)
    expect(dv.getUint8(1)).toBe(2)
    expect(dv.getUint8(2)).toBe(3)
  })
})

describe('view', () => {
  it('should convert a buffer to a typed array', () => {
    const buf = new Uint8Array([1, 2, 3, 4])
    const u16 = view(Uint16Array, buf)

    // this depends on the endianness of the platform
    expect(u16[0]).oneOf([0x0102, 0x0201])
    expect(u16[1]).oneOf([0x0304, 0x0403])
  })
})
