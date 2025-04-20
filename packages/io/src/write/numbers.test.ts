import { hex, u8 } from '@fuman/utils'
import { describe, expect, it } from 'vitest'

import { Bytes } from '../bytes.js'

import * as write from './numbers.js'

describe('write/numbers', () => {
  describe('8-bit', () => {
    it('should write uint8', () => {
      const c = Bytes.alloc()
      write.uint8(c, 0x12)
      expect(c.result()).toEqual(new Uint8Array([0x12]))
      expect(c.written).toBe(1)
    })

    it('should write int8', () => {
      const c = Bytes.alloc()

      write.int8(c, 0x23)
      write.int8(c, -85)
      write.int8(c, 124)
      write.int8(c, -17)

      expect(c.result()).toEqual(new Uint8Array([0x23, 0xAB, 0x7C, 0xEF]))
      expect(c.written).toBe(4)
    })

    it('should throw if writing out of bounds', () => {
      const c = Bytes.alloc()

      expect(() => write.int8(c, 0x100)).toThrow(RangeError)
      expect(() => write.int8(c, -0x101)).toThrow(RangeError)
    })
  })

  describe('16-bit', () => {
    it('should write uint16', () => {
      const c = Bytes.alloc()
      write.uint16be(c, 0x2A)
      write.uint16be(c, 0x2A42)
      write.uint16be(c, 0x423F)
      write.uint16le(c, 0x2A00)
      write.uint16le(c, 0x422A)
      write.uint16le(c, 0x3F42)
      expect(c.result()).toEqual(
        new Uint8Array([0x00, 0x2A, 0x2A, 0x42, 0x42, 0x3F, 0x00, 0x2A, 0x2A, 0x42, 0x42, 0x3F]),
      )
      expect(c.written).toBe(12)
    })

    it('should write int16', () => {
      const c = Bytes.alloc()

      write.int16be(c, -214)
      write.int16be(c, 10818)
      write.int16be(c, 17151)
      write.int16le(c, 11007)
      write.int16le(c, 16938)
      write.int16le(c, -190)

      expect(c.result()).toEqual(
        new Uint8Array([0xFF, 0x2A, 0x2A, 0x42, 0x42, 0xFF, 0xFF, 0x2A, 0x2A, 0x42, 0x42, 0xFF]),
      )
    })

    it('should throw if writing out of bounds', () => {
      const c = Bytes.alloc()

      expect(() => write.int16be(c, 0x10000)).toThrow(RangeError)
      expect(() => write.int16be(c, -0x10000)).toThrow(RangeError)
      expect(() => write.int16le(c, 0x10000)).toThrow(RangeError)
      expect(() => write.int16le(c, -0x10000)).toThrow(RangeError)
    })
  })

  describe('24-bit', () => {
    it('should write uint24', () => {
      const c = Bytes.alloc()
      write.uint24be(c, 0x123456)
      write.uint24be(c, 0x345678)
      write.uint24be(c, 0x56789A)
      write.uint24le(c, 0x563412)
      write.uint24le(c, 0x785634)
      write.uint24le(c, 0x9A7856)

      expect(c.result()).toEqual(
        new Uint8Array([0x12, 0x34, 0x56, 0x34, 0x56, 0x78, 0x56, 0x78, 0x9A, 0x12, 0x34, 0x56, 0x34, 0x56, 0x78, 0x56, 0x78, 0x9A]),
      )
      expect(c.written).toBe(18)
    })

    it('should write int24', () => {
      const c = Bytes.alloc()
      write.int24be(c, 0x12FF34)
      write.int24be(c, -52138)
      write.int24be(c, 0x3456FF)
      write.int24le(c, 0x34FF12)
      write.int24le(c, 0x5634FF)
      write.int24le(c, -43468)

      expect(c.result()).toEqual(
        new Uint8Array([0x12, 0xFF, 0x34, 0xFF, 0x34, 0x56, 0x34, 0x56, 0xFF, 0x12, 0xFF, 0x34, 0xFF, 0x34, 0x56, 0x34, 0x56, 0xFF]),
      )
      expect(c.written).toBe(18)
    })

    it('should throw if writing out of bounds', () => {
      const c = Bytes.alloc()

      expect(() => write.int24be(c, 0x1000000)).toThrow(RangeError)
      expect(() => write.int24be(c, -0x1000000)).toThrow(RangeError)
      expect(() => write.int24le(c, 0x1000000)).toThrow(RangeError)
      expect(() => write.int24le(c, -0x1000000)).toThrow(RangeError)
    })
  })

  describe('32-bit', () => {
    it('should write uint32', () => {
      const c = Bytes.alloc()
      write.uint32be(c, 0x32654256)
      write.uint32be(c, 0x65425623)
      write.uint32be(c, 0x425623FF)
      write.uint32le(c, 0x56426532)
      write.uint32le(c, 0x23564265)
      write.uint32le(c, 0xFF235642)
      expect(c.result()).toEqual(
        new Uint8Array([
          ...[0x32, 0x65, 0x42, 0x56, 0x65, 0x42, 0x56, 0x23, 0x42, 0x56, 0x23, 0xFF],
          ...[0x32, 0x65, 0x42, 0x56, 0x65, 0x42, 0x56, 0x23, 0x42, 0x56, 0x23, 0xFF],
        ]),
      )
      expect(c.written).toBe(24)
    })

    it('should write int32', () => {
      const c = Bytes.alloc()
      write.int32be(c, -13474494)
      write.int32be(c, 0x32654256)
      write.int32be(c, 0x654256FF)
      write.int32le(c, 0x426532FF)
      write.int32le(c, 0x56426532)
      write.int32le(c, -11124123)
      expect(c.result()).toEqual(
        new Uint8Array([
          ...[0xFF, 0x32, 0x65, 0x42, 0x32, 0x65, 0x42, 0x56, 0x65, 0x42, 0x56, 0xFF],
          ...[0xFF, 0x32, 0x65, 0x42, 0x32, 0x65, 0x42, 0x56, 0x65, 0x42, 0x56, 0xFF],
        ]),
      )
      expect(c.written).toBe(24)
    })

    it('should throw if writing out of bounds', () => {
      const c = Bytes.alloc()

      expect(() => write.int32be(c, 0x100000000)).toThrow(RangeError)
      expect(() => write.int32be(c, -0x100000000)).toThrow(RangeError)
      expect(() => write.int32le(c, 0x100000000)).toThrow(RangeError)
      expect(() => write.int32le(c, -0x100000000)).toThrow(RangeError)
    })
  })

  describe('64-bit', () => {
    it('should write uint64', () => {
      const c = Bytes.alloc()
      write.uint64be(c, 0x123456789ABCDEF0n)
      write.uint64be(c, 0xF0DEBC9A78563412n)
      write.uint64le(c, 0xF0DEBC9A78563412n)
      write.uint64le(c, 0x123456789ABCDEF0n)

      expect(c.result()).toEqual(
        new Uint8Array([
          ...[0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0],
          ...u8.toReversed([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0]),
          ...[0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0],
          ...u8.toReversed([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0]),
        ]),
      )
      expect(c.written).toBe(32)
    })

    it('should write int64', () => {
      const c = Bytes.alloc()
      write.int64be(c, 0x123456789ABCDEF0n)
      write.int64be(c, -1090226688147180526n)
      write.int64le(c, -1090226688147180526n)
      write.int64le(c, 0x123456789ABCDEF0n)

      expect(c.result()).toEqual(
        new Uint8Array([
          ...[0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0],
          ...u8.toReversed([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0]),
          ...[0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0],
          ...u8.toReversed([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0]),
        ]),
      )
      expect(c.written).toBe(32)
    })

    it('should throw if writing out of bounds', () => {
      const c = Bytes.alloc()

      expect(() => write.int64be(c, 0x10000000000000000n)).toThrow(RangeError)
      expect(() => write.int64be(c, -0x10000000000000000n)).toThrow(RangeError)
      expect(() => write.int64le(c, 0x10000000000000000n)).toThrow(RangeError)
      expect(() => write.int64le(c, -0x10000000000000000n)).toThrow(RangeError)
    })
  })

  describe('arbitrary ints', () => {
    it('uintbe', () => {
      const c = Bytes.alloc()

      write.uintbe(c, 1, 0x12n)
      write.uintbe(c, 1, 0xF0n)
      write.uintbe(c, 2, 0x1234n)
      write.uintbe(c, 2, 0xF0DEn)
      write.uintbe(c, 3, 0x123456n)
      write.uintbe(c, 3, 0xF0DEBCn)
      write.uintbe(c, 4, 0x12345678n)
      write.uintbe(c, 4, 0xF0DEBC9An)
      write.uintbe(c, 5, 0x123456789An)
      write.uintbe(c, 5, 0xF0DEBC9A78n)
      write.uintbe(c, 6, 0x123456789ABCn)
      write.uintbe(c, 6, 0xF0DEBC9A7856n)
      write.uintbe(c, 7, 0x123456789ABCDEn)
      write.uintbe(c, 7, 0xF0DEBC9A785634n)
      write.uintbe(c, 8, 0x123456789ABCDEF0n)
      write.uintbe(c, 8, 0xF0DEBC9A78563412n)

      expect(c.result()).toEqual(new Uint8Array([
        ...[0x12, 0xF0, 0x12, 0x34, 0xF0, 0xDE, 0x12, 0x34, 0x56, 0xF0, 0xDE, 0xBC],
        ...[0x12, 0x34, 0x56, 0x78, 0xF0, 0xDE, 0xBC, 0x9A],
        ...[0x12, 0x34, 0x56, 0x78, 0x9A, 0xF0, 0xDE, 0xBC, 0x9A, 0x78],
        ...[0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xF0, 0xDE, 0xBC, 0x9A, 0x78, 0x56],
        ...[0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0, 0xDE, 0xBC, 0x9A, 0x78, 0x56, 0x34],
        ...[0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0],
        ...[0xF0, 0xDE, 0xBC, 0x9A, 0x78, 0x56, 0x34, 0x12],
      ]))
    })

    it('uintle', () => {
      const c = Bytes.alloc()
      write.uintle(c, 1, 0xF0n)
      write.uintle(c, 1, 0x12n)
      write.uintle(c, 2, 0xDEF0n)
      write.uintle(c, 2, 0x3412n)
      write.uintle(c, 3, 0xBCDEF0n)
      write.uintle(c, 3, 0x563412n)
      write.uintle(c, 4, 0x9ABCDEF0n)
      write.uintle(c, 4, 0x78563412n)
      write.uintle(c, 5, 0x789ABCDEF0n)
      write.uintle(c, 5, 0x9A78563412n)
      write.uintle(c, 6, 0x56789ABCDEF0n)
      write.uintle(c, 6, 0xBC9A78563412n)
      write.uintle(c, 7, 0x3456789ABCDEF0n)
      write.uintle(c, 7, 0xDEBC9A78563412n)
      write.uintle(c, 8, 0x123456789ABCDEF0n)
      write.uintle(c, 8, 0xF0DEBC9A78563412n)

      expect(c.result()).toEqual(new Uint8Array([
        ...[0xF0, 0x12, 0xF0, 0xDE, 0x12, 0x34, 0xF0, 0xDE, 0xBC, 0x12, 0x34, 0x56],
        ...[0xF0, 0xDE, 0xBC, 0x9A, 0x12, 0x34, 0x56, 0x78],
        ...[0xF0, 0xDE, 0xBC, 0x9A, 0x78, 0x12, 0x34, 0x56, 0x78, 0x9A],
        ...[0xF0, 0xDE, 0xBC, 0x9A, 0x78, 0x56, 0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC],
        ...[0xF0, 0xDE, 0xBC, 0x9A, 0x78, 0x56, 0x34],
        ...[0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE],
        ...[0xF0, 0xDE, 0xBC, 0x9A, 0x78, 0x56, 0x34, 0x12],
        ...[0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0],
      ]))
    })

    it('intbe', () => {
      const c = Bytes.alloc()

      write.intbe(c, 1, 0x12n)
      write.intbe(c, 1, -16n)
      write.intbe(c, 2, 0x1234n)
      write.intbe(c, 2, -3874n)
      write.intbe(c, 3, 0x123456n)
      write.intbe(c, 3, -991556n)
      write.intbe(c, 4, 0x12345678n)
      write.intbe(c, 4, -253838182n)
      write.intbe(c, 5, 0x123456789An)
      write.intbe(c, 5, -64982574472n)
      write.intbe(c, 6, 0x123456789ABCn)
      write.intbe(c, 6, -16635539064746n)
      write.intbe(c, 7, 0x123456789ABCDEn)
      write.intbe(c, 7, -4258698000574924n)
      write.intbe(c, 8, 0x123456789ABCDEF0n)
      write.intbe(c, 8, -1090226688147180526n)

      expect(c.result()).toEqual(new Uint8Array([
        ...[0x12, 0xF0, 0x12, 0x34, 0xF0, 0xDE, 0x12, 0x34, 0x56, 0xF0, 0xDE, 0xBC],
        ...[0x12, 0x34, 0x56, 0x78, 0xF0, 0xDE, 0xBC, 0x9A],
        ...[0x12, 0x34, 0x56, 0x78, 0x9A, 0xF0, 0xDE, 0xBC, 0x9A, 0x78],
        ...[0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xF0, 0xDE, 0xBC, 0x9A, 0x78, 0x56],
        ...[0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0, 0xDE, 0xBC, 0x9A, 0x78, 0x56, 0x34],
        ...[0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0],
        ...[0xF0, 0xDE, 0xBC, 0x9A, 0x78, 0x56, 0x34, 0x12],
      ]))
    })

    it('intle', () => {
      const c = Bytes.alloc()

      write.intle(c, 1, -16n)
      write.intle(c, 1, 0x12n)
      write.intle(c, 2, -8464n)
      write.intle(c, 2, 0x3412n)
      write.intle(c, 3, -4399376n)
      write.intle(c, 3, 0x563412n)
      write.intle(c, 4, -1698898192n)
      write.intle(c, 4, 0x78563412n)
      write.intle(c, 5, 0x789ABCDEF0n)
      write.intle(c, 5, -436067748846n)
      write.intle(c, 6, 0x56789ABCDEF0n)
      write.intle(c, 6, -74103346809838n)
      write.intle(c, 7, 0x3456789ABCDEF0n)
      write.intle(c, 7, -9362777578261486n)
      write.intle(c, 8, 0x123456789ABCDEF0n)
      write.intle(c, 8, -1090226688147180526n)

      expect(c.result()).toEqual(new Uint8Array([
        ...[0xF0, 0x12, 0xF0, 0xDE, 0x12, 0x34, 0xF0, 0xDE, 0xBC, 0x12, 0x34, 0x56],
        ...[0xF0, 0xDE, 0xBC, 0x9A, 0x12, 0x34, 0x56, 0x78],
        ...[0xF0, 0xDE, 0xBC, 0x9A, 0x78, 0x12, 0x34, 0x56, 0x78, 0x9A],
        ...[0xF0, 0xDE, 0xBC, 0x9A, 0x78, 0x56, 0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC],
        ...[0xF0, 0xDE, 0xBC, 0x9A, 0x78, 0x56, 0x34],
        ...[0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE],
        ...[0xF0, 0xDE, 0xBC, 0x9A, 0x78, 0x56, 0x34, 0x12],
        ...[0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0],
      ]))
    })

    it('should throw if writing out of bounds', () => {
      const c = Bytes.alloc()

      expect(() => write.intbe(c, 1, 0x10000n)).toThrow(RangeError)
      expect(() => write.intle(c, 1, 0x10000n)).toThrow(RangeError)
      expect(() => write.intbe(c, 1, -0x10000n)).toThrow(RangeError)
      expect(() => write.intle(c, 1, -0x10000n)).toThrow(RangeError)
      expect(() => write.intbe(c, 2, 0x10000n)).toThrow(RangeError)
      expect(() => write.intle(c, 2, 0x10000n)).toThrow(RangeError)
      expect(() => write.intbe(c, 2, -0x10000n)).toThrow(RangeError)
      expect(() => write.intle(c, 2, -0x10000n)).toThrow(RangeError)
      expect(() => write.intbe(c, 3, 0x1000000n)).toThrow(RangeError)
      expect(() => write.intle(c, 3, 0x1000000n)).toThrow(RangeError)
      expect(() => write.intbe(c, 3, -0x1000000n)).toThrow(RangeError)
      expect(() => write.intle(c, 3, -0x1000000n)).toThrow(RangeError)
    })
  })

  describe('float32le', () => {
    it('should write float32 little-endian', () => {
      const c = Bytes.alloc()
      write.float32le(c, 3.1415927410125732)
      expect(c.result()).toEqual(hex.decode('40490FDB').reverse())
      expect(c.written).toBe(4)
    })
  })

  describe('float32be', () => {
    it('should write float32 big-endian', () => {
      const c = Bytes.alloc()
      write.float32be(c, 3.1415927410125732)
      expect(c.result()).toEqual(hex.decode('40490FDB'))
      expect(c.written).toBe(4)
    })
  })

  describe('float64le', () => {
    it('should write float64 little-endian', () => {
      const c = Bytes.alloc()
      write.float64le(c, 3.141592653589793)
      expect(c.result()).toEqual(hex.decode('400921FB54442D18').reverse())
      expect(c.written).toBe(8)
    })
  })

  describe('float64be', () => {
    it('should write float64 big-endian', () => {
      const c = Bytes.alloc()
      write.float64be(c, 3.141592653589793)
      expect(c.result()).toEqual(hex.decode('400921FB54442D18'))
      expect(c.written).toBe(8)
    })
  })

  it('should accept byte arrays', () => {
    const c = new Uint8Array(4)

    write.uint8(c, 0x12)
    write.uint8(c.subarray(1), 0x34)
    write.uint16le(c.subarray(2), 0x5678)

    expect(c).toEqual(new Uint8Array([0x12, 0x34, 0x78, 0x56]))
  })
})
