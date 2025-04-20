import { hex } from '@fuman/utils'

import { describe, expect, it } from 'vitest'

import { Bytes } from '../bytes.js'
import * as read from './index.js'

describe('read/strings', () => {
  describe('rawString', () => {
    it('should read a raw string', () => {
      expect(read.rawString(new Uint8Array([104, 101, 108, 108, 111]), 5)).toBe('hello')
    })

    it('should throw if reading past the end', () => {
      const buffer = new Uint8Array([104, 101, 108, 108, 111])
      const c = Bytes.from(buffer)
      expect(() => read.rawString(c, 6)).toThrow(RangeError)
    })
  })

  describe('utf8String', () => {
    it('should read a utf8 string', () => {
      const buffer = new Uint8Array([0xF0, 0x9F, 0x8C, 0xB8])
      const c = Bytes.from(buffer)
      expect(read.utf8String(c, 4)).toBe('🌸')
      expect(c.available).toBe(0)
    })

    it('should throw if reading past the end', () => {
      const buffer = new Uint8Array([104, 101, 108, 108, 111])
      const c = Bytes.from(buffer)
      expect(() => read.utf8String(c, 6)).toThrow(RangeError)
    })
  })

  describe('cUtf8String', () => {
    it('should read a c utf8 string', () => {
      const buffer = new Uint8Array([0xF0, 0x9F, 0x8C, 0xB8, 0])
      const c = Bytes.from(buffer)
      expect(read.cUtf8String(c)).toBe('🌸')
      expect(c.available).toBe(0)
    })

    it('should throw if reading past the end', () => {
      const buffer = new Uint8Array([0xF0, 0x9F, 0x8C, 0xB8])
      const c = Bytes.from(buffer)
      expect(() => read.cUtf8String(c)).toThrow(RangeError)
    })
  })

  describe('utf16beString', () => {
    it('should read a utf16be string', () => {
      expect(read.utf16beString(hex.decode('006d0065006f0077'), 8)).toEqual('meow')
      expect(read.utf16beString(hex.decode('d83dde4f'), 4)).toEqual('🙏')
      expect(read.utf16beString(hex.decode('6211723153174eac59295b8995e8'), 14)).toEqual('我爱北京天安门')
    })
  })

  describe('utf16leString', () => {
    it('should read a utf16be string', () => {
      expect(read.utf16leString(hex.decode('6d0065006f007700'), 8)).toEqual('meow')
      expect(read.utf16leString(hex.decode('3dd84fde'), 4)).toEqual('🙏')
      expect(read.utf16leString(hex.decode('116231721753ac4e2959895be895'), 14)).toEqual('我爱北京天安门')
    })
  })

  describe('untilZero', () => {
    it('should read until zero', () => {
      const buffer = new Uint8Array([104, 101, 108, 108, 111, 0, 119, 111, 114, 108, 100])
      const c = Bytes.from(buffer)
      expect(read.untilZero(c)).toEqual(new Uint8Array([104, 101, 108, 108, 111, 0]))
      expect(c.available).toBe(5)
    })

    it('should read until zero at the end', () => {
      const buffer = new Uint8Array([104, 101, 108, 108, 111, 0])
      const c = Bytes.from(buffer)
      expect(read.untilZero(c)).toEqual(new Uint8Array([104, 101, 108, 108, 111, 0]))
      expect(c.available).toBe(0)
    })
  })

  describe('untilEnd', () => {
    it('should read until the end', () => {
      const buffer = new Uint8Array([104, 101, 108, 108, 111, 0, 119, 111, 114, 108, 100])
      const c = Bytes.from(buffer)
      expect(read.untilEnd(c)).toEqual(new Uint8Array([104, 101, 108, 108, 111, 0, 119, 111, 114, 108, 100]))
      expect(c.available).toBe(0)
    })
  })

  describe('lengthPrefixed', () => {
    it('should read a length prefixed string', () => {
      const buffer = new Uint8Array([0, 5, 104, 101, 108, 108, 111])
      const c = Bytes.from(buffer)
      expect(read.lengthPrefixed(read.uint16be, c)).toEqual(new Uint8Array([104, 101, 108, 108, 111]))
      expect(c.available).toBe(0)
    })
  })
})
