import { u8 } from '@fuman/utils'

import { describe, expect, it } from 'vitest'

import { Bytes } from '../bytes.js'
import * as read from './numbers.js'

describe('read/numbers', () => {
  describe('8-bit', () => {
    it('should read uint8', () => {
      const buffer = new Uint8Array([0xFF, 0x2A, 0x2A, 0x2A])
      const c = Bytes.from(buffer)
      expect(read.uint8(c)).toBe(0xFF)
      expect(read.uint8(c)).toBe(0x2A)
      expect(read.uint8(c)).toBe(0x2A)
    })

    it('should read int8', () => {
      const buffer = new Uint8Array([0x23, 0xAB, 0x7C, 0xEF])

      expect(read.int8(buffer.subarray(0))).toBe(0x23)
      expect(read.int8(buffer.subarray(1))).toBe(-85)
      expect(read.int8(buffer.subarray(2))).toBe(124)
      expect(read.int8(buffer.subarray(3))).toBe(-17)
    })

    it('should throw if reading past the end', () => {
      const buffer = new Uint8Array([0x12])
      const c = Bytes.from(buffer)
      expect(read.int8(c)).toBe(0x12)
      expect(() => read.int8(c)).toThrow(RangeError)
    })
  })

  describe('16-bit', () => {
    it('should read uint16', () => {
      const bytes = new Uint8Array([0x00, 0x2A, 0x42, 0x3F])

      expect(read.uint16be(bytes)).toBe(0x2A)
      expect(read.uint16be(bytes.subarray(1))).toBe(0x2A42)
      expect(read.uint16be(bytes.subarray(2))).toBe(0x423F)
      expect(read.uint16le(bytes)).toBe(0x2A00)
      expect(read.uint16le(bytes.subarray(1))).toBe(0x422A)
      expect(read.uint16le(bytes.subarray(2))).toBe(0x3F42)
    })

    it('should read int16', () => {
      const bytes = new Uint8Array([0xFF, 0x2A, 0x42, 0xFF])

      expect(read.int16be(bytes)).toBe(-214)
      expect(read.int16be(bytes.subarray(1))).toBe(10818)
      expect(read.int16be(bytes.subarray(2))).toBe(17151)
      expect(read.int16le(bytes)).toBe(11007)
      expect(read.int16le(bytes.subarray(1))).toBe(16938)
      expect(read.int16le(bytes.subarray(2))).toBe(-190)
    })

    it('should throw if reading past the end', () => {
      const buffer = new Uint8Array([0x12, 0x34])
      const c = Bytes.from(buffer)
      expect(read.uint16be(c)).toBe(0x1234)
      expect(() => read.uint16be(c)).toThrow(RangeError)
    })
  })

  describe('24-bit', () => {
    it('should read uint24', () => {
      const buffer = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9A])
      expect(read.uint24be(buffer.subarray(0))).toEqual(0x123456)
      expect(read.uint24be(buffer.subarray(1))).toEqual(0x345678)
      expect(read.uint24be(buffer.subarray(2))).toEqual(0x56789A)
      expect(read.uint24le(buffer.subarray(0))).toEqual(0x563412)
      expect(read.uint24le(buffer.subarray(1))).toEqual(0x785634)
      expect(read.uint24le(buffer.subarray(2))).toEqual(0x9A7856)
    })

    it('should read int24', () => {
      const buffer = new Uint8Array([0x12, 0xFF, 0x34, 0x56, 0xFF])
      expect(read.int24be(buffer.subarray(0))).toEqual(0x12FF34)
      expect(read.int24be(buffer.subarray(1))).toEqual(-52138)
      expect(read.int24be(buffer.subarray(2))).toEqual(0x3456FF)
      expect(read.int24le(buffer.subarray(0))).toEqual(0x34FF12)
      expect(read.int24le(buffer.subarray(1))).toEqual(0x5634FF)
      expect(read.int24le(buffer.subarray(2))).toEqual(-43468)
    })

    it('should throw if reading past the end', () => {
      const buffer = new Uint8Array([0x12, 0x34, 0x56])
      const c = Bytes.from(buffer)
      expect(read.uint24be(c)).toBe(0x123456)
      expect(() => read.uint24le(c)).toThrow(RangeError)
    })
  })

  describe('32-bit', () => {
    it('should read uint32', () => {
      const buffer = new Uint8Array([0x32, 0x65, 0x42, 0x56, 0x23, 0xFF])
      expect(read.uint32be(buffer.subarray(0))).toEqual(0x32654256)
      expect(read.uint32be(buffer.subarray(1))).toEqual(0x65425623)
      expect(read.uint32be(buffer.subarray(2))).toEqual(0x425623FF)
      expect(read.uint32le(buffer.subarray(0))).toEqual(0x56426532)
      expect(read.uint32le(buffer.subarray(1))).toEqual(0x23564265)
      expect(read.uint32le(buffer.subarray(2))).toEqual(0xFF235642)
    })

    it('should read int32', () => {
      const buffer = new Uint8Array([0xFF, 0x32, 0x65, 0x42, 0x56, 0xFF])
      expect(read.int32be(buffer.subarray(0))).toEqual(-13474494)
      expect(read.int32be(buffer.subarray(1))).toEqual(0x32654256)
      expect(read.int32be(buffer.subarray(2))).toEqual(0x654256FF)
      expect(read.int32le(buffer.subarray(0))).toEqual(0x426532FF)
      expect(read.int32le(buffer.subarray(1))).toEqual(0x56426532)
      expect(read.int32le(buffer.subarray(2))).toEqual(-11124123)
    })

    it('should throw if reading past the end', () => {
      const buffer = new Uint8Array([0x12, 0x34, 0x56, 0x78])
      const c = Bytes.from(buffer)
      expect(read.uint32be(c)).toBe(0x12345678)
      expect(() => read.uint32be(c)).toThrow(RangeError)
    })
  })

  describe('64-bit', () => {
    it('should read uint64', () => {
      const buffer = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0])
      expect(read.uint64be(buffer)).toEqual(0x123456789ABCDEF0n)
      expect(read.uint64be(u8.toReversed(buffer))).toEqual(0xF0DEBC9A78563412n)
      expect(read.uint64le(buffer)).toEqual(0xF0DEBC9A78563412n)
      expect(read.uint64le(u8.toReversed(buffer))).toEqual(0x123456789ABCDEF0n)
    })

    it('should read int64', () => {
      const buffer = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0])
      expect(read.int64be(buffer)).toEqual(0x123456789ABCDEF0n)
      expect(read.int64be(u8.toReversed(buffer))).toEqual(-1090226688147180526n)
      expect(read.int64le(buffer)).toEqual(-1090226688147180526n)
      expect(read.int64le(u8.toReversed(buffer))).toEqual(0x123456789ABCDEF0n)
    })

    it('should throw if reading past the end', () => {
      const buffer = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE])
      expect(() => read.uint64le(buffer)).toThrow(RangeError)
    })
  })

  describe('arbitrary ints', () => {
    it('uintbe', () => {
      const buffer = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0])
      const rev = u8.toReversed(buffer)
      expect(read.uintbe(buffer, 1)).toEqual(0x12n)
      expect(read.uintbe(rev, 1)).toEqual(0xF0n)
      expect(read.uintbe(buffer, 2)).toEqual(0x1234n)
      expect(read.uintbe(rev, 2)).toEqual(0xF0DEn)
      expect(read.uintbe(buffer, 3)).toEqual(0x123456n)
      expect(read.uintbe(rev, 3)).toEqual(0xF0DEBCn)
      expect(read.uintbe(buffer, 4)).toEqual(0x12345678n)
      expect(read.uintbe(rev, 4)).toEqual(0xF0DEBC9An)
      expect(read.uintbe(buffer, 5)).toEqual(0x123456789An)
      expect(read.uintbe(rev, 5)).toEqual(0xF0DEBC9A78n)
      expect(read.uintbe(buffer, 6)).toEqual(0x123456789ABCn)
      expect(read.uintbe(rev, 6)).toEqual(0xF0DEBC9A7856n)
      expect(read.uintbe(buffer, 7)).toEqual(0x123456789ABCDEn)
      expect(read.uintbe(rev, 7)).toEqual(0xF0DEBC9A785634n)
      expect(read.uintbe(buffer, 8)).toEqual(0x123456789ABCDEF0n)
      expect(read.uintbe(rev, 8)).toEqual(0xF0DEBC9A78563412n)
    })

    it('uintle', () => {
      const buffer = new Uint8Array([0xF0, 0xDE, 0xBC, 0x9A, 0x78, 0x56, 0x34, 0x12])
      const rev = u8.toReversed(buffer)
      expect(read.uintle(buffer, 1)).toEqual(0xF0n)
      expect(read.uintle(rev, 1)).toEqual(0x12n)
      expect(read.uintle(buffer, 2)).toEqual(0xDEF0n)
      expect(read.uintle(rev, 2)).toEqual(0x3412n)
      expect(read.uintle(buffer, 3)).toEqual(0xBCDEF0n)
      expect(read.uintle(rev, 3)).toEqual(0x563412n)
      expect(read.uintle(buffer, 4)).toEqual(0x9ABCDEF0n)
      expect(read.uintle(rev, 4)).toEqual(0x78563412n)
      expect(read.uintle(buffer, 5)).toEqual(0x789ABCDEF0n)
      expect(read.uintle(rev, 5)).toEqual(0x9A78563412n)
      expect(read.uintle(buffer, 6)).toEqual(0x56789ABCDEF0n)
      expect(read.uintle(rev, 6)).toEqual(0xBC9A78563412n)
      expect(read.uintle(buffer, 7)).toEqual(0x3456789ABCDEF0n)
      expect(read.uintle(rev, 7)).toEqual(0xDEBC9A78563412n)
      expect(read.uintle(buffer, 8)).toEqual(0x123456789ABCDEF0n)
      expect(read.uintle(rev, 8)).toEqual(0xF0DEBC9A78563412n)
    })

    it('intbe', () => {
      const buffer = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0])
      const rev = u8.toReversed(buffer)
      expect(read.intbe(buffer, 1)).toEqual(0x12n)
      expect(read.intbe(rev, 1)).toEqual(-16n)
      expect(read.intbe(buffer, 2)).toEqual(0x1234n)
      expect(read.intbe(rev, 2)).toEqual(-3874n)
      expect(read.intbe(buffer, 3)).toEqual(0x123456n)
      expect(read.intbe(rev, 3)).toEqual(-991556n)
      expect(read.intbe(buffer, 4)).toEqual(0x12345678n)
      expect(read.intbe(rev, 4)).toEqual(-253838182n)
      expect(read.intbe(buffer, 5)).toEqual(0x123456789An)
      expect(read.intbe(rev, 5)).toEqual(-64982574472n)
      expect(read.intbe(buffer, 6)).toEqual(0x123456789ABCn)
      expect(read.intbe(rev, 6)).toEqual(-16635539064746n)
      expect(read.intbe(buffer, 7)).toEqual(0x123456789ABCDEn)
      expect(read.intbe(rev, 7)).toEqual(-4258698000574924n)
      expect(read.intbe(buffer, 8)).toEqual(0x123456789ABCDEF0n)
      expect(read.intbe(rev, 8)).toEqual(-1090226688147180526n)
    })

    it('intle', () => {
      const buffer = new Uint8Array([0xF0, 0xDE, 0xBC, 0x9A, 0x78, 0x56, 0x34, 0x12])
      const rev = u8.toReversed(buffer)
      expect(read.intle(buffer, 1)).toEqual(-16n)
      expect(read.intle(rev, 1)).toEqual(0x12n)
      expect(read.intle(buffer, 2)).toEqual(-8464n)
      expect(read.intle(rev, 2)).toEqual(0x3412n)
      expect(read.intle(buffer, 3)).toEqual(-4399376n)
      expect(read.intle(rev, 3)).toEqual(0x563412n)
      expect(read.intle(buffer, 4)).toEqual(-1698898192n)
      expect(read.intle(rev, 4)).toEqual(0x78563412n)
      expect(read.intle(buffer, 5)).toEqual(0x789ABCDEF0n)
      expect(read.intle(rev, 5)).toEqual(-436067748846n)
      expect(read.intle(buffer, 6)).toEqual(0x56789ABCDEF0n)
      expect(read.intle(rev, 6)).toEqual(-74103346809838n)
      expect(read.intle(buffer, 7)).toEqual(0x3456789ABCDEF0n)
      expect(read.intle(rev, 7)).toEqual(-9362777578261486n)
      expect(read.intle(buffer, 8)).toEqual(0x123456789ABCDEF0n)
      expect(read.intle(rev, 8)).toEqual(-1090226688147180526n)
    })
  })

  describe('float32', () => {
    it('should read float32 big-endian', () => {
      const buffer = new Uint8Array([
        0x40,
        0x49,
        0x0F,
        0xDB,
        0xC0,
        0x00,
        0x00,
        0x00,
      ])
      const c = Bytes.from(buffer)
      expect(read.float32be(c)).toBeCloseTo(3.1415927410125732)
      expect(c.available).toBe(4)
    })

    it('should read float32 little-endian', () => {
      const buffer = new Uint8Array([
        0xDB,
        0x0F,
        0x49,
        0x40,
        0x00,
        0x00,
        0x00,
        0xC0,
      ])
      const c = Bytes.from(buffer)
      expect(read.float32le(c)).toBeCloseTo(3.1415927410125732)
      expect(c.available).toBe(4)
    })

    it('should throw if reading past the end', () => {
      const buffer = new Uint8Array([0x40, 0x49, 0x0F])
      const c = Bytes.from(buffer)
      expect(() => read.float32le(c)).toThrow(RangeError)
    })
  })

  describe('float64', () => {
    it('should read float64 big-endian', () => {
      const buffer = new Uint8Array([
        0x40,
        0x09,
        0x21,
        0xFB,
        0x54,
        0x44,
        0x2D,
        0x18,
        0xC0,
        0x83,
        0x12,
        0x6F,
        0x3D,
        0x0A,
        0xD7,
        0xA3,
      ])
      const c = Bytes.from(buffer)
      expect(read.float64be(c)).toBeCloseTo(3.141592653589793)
      expect(c.available).toBe(8)
    })

    it('should read float64 little-endian', () => {
      const buffer = new Uint8Array([
        0x18,
        0x2D,
        0x44,
        0x54,
        0xFB,
        0x21,
        0x09,
        0x40,
        0xA3,
        0xD7,
        0x0A,
        0x3D,
        0x6F,
        0x12,
        0x83,
        0xC0,
      ])
      const c = Bytes.from(buffer)
      expect(read.float64le(c)).toBeCloseTo(3.141592653589793)
      expect(c.available).toBe(8)
    })

    it('should throw if reading past the end', () => {
      const buffer = new Uint8Array([
        0x40,
        0x09,
        0x21,
        0xFB,
        0x54,
        0x44,
        0x2D,
      ])
      const c = Bytes.from(buffer)
      expect(() => read.float64le(c)).toThrow(RangeError)
    })
  })

  it('should accept readables', () => {
    // it is enough to test one method, because the rest use the same abstraction
    // ideally we should test all methods, but ehh im lazy
    const buffer = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0])
    const readable = Bytes.from(buffer)
    expect(read.uintbe(readable, 1)).toEqual(0x12n)
    expect(read.uintbe(readable, 2)).toEqual(0x3456n)
  })
})
