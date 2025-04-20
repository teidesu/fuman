import { describe, expect, it } from 'vitest'

import * as ip from './v4.js'

describe('ipv4', () => {
  describe('parseV4', () => {
    it.each([
      ['1.2.3.4', new Uint8Array([1, 2, 3, 4])],
      ['134744072', new Uint8Array([8, 8, 8, 8])],
      ['1', new Uint8Array([0, 0, 0, 1])],
      ['1.2', new Uint8Array([1, 0, 0, 2])],
      ['1.2.3', new Uint8Array([1, 2, 0, 3])],
    ])('parses "%s"', (input, expected) => {
      expect(ip.parseV4(input)).toEqual({
        type: 'ipv4',
        parts: expected,
      })
    })

    it('throws on too many parts', () => {
      expect(() => ip.parseV4('1.2.3.4.5')).toThrow()
    })

    it('throws on invalid parts', () => {
      expect(() => ip.parseV4('1234.56.78.12')).toThrow()
    })
  })

  describe('stringifyV4', () => {
    it('stringifies', () => {
      expect(ip.stringifyV4({
        type: 'ipv4',
        parts: new Uint8Array([1, 2, 3, 4]),
      })).toBe('1.2.3.4')
    })

    it('throws on invalid input', () => {
      expect(() => ip.stringifyV4({ type: 'ipv4', parts: new Uint8Array() })).toThrow()
    })
  })
})
