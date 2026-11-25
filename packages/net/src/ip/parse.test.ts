import { describe, expect, it } from 'vitest'

import * as ip from './parse.js'

describe('parse', () => {
  it('should parse ipv4', () => {
    expect(ip.parse('127.0.0.1')).toEqual({
      type: 'ipv4',
      parts: new Uint8Array([127, 0, 0, 1]),
    })
  })

  it('should parse ipv6', () => {
    expect(ip.parse('::1')).toEqual({
      type: 'ipv6',
      parts: new Uint16Array([0, 0, 0, 0, 0, 0, 0, 1]),
    })
  })

  it('should parse transitional ipv6', () => {
    expect(ip.parse('::ffff:1.2.3.4')).toEqual({
      type: 'ipv6',
      parts: new Uint16Array([0, 0, 0, 0, 0, 0xFFFF, 0x0102, 0x0304]),
    })
  })
})

describe('parseWithPort', () => {
  it('should parse ipv4 with port', () => {
    expect(ip.parseWithPort('0.0.0.0:1234')).toEqual([
      {
        type: 'ipv4',
        parts: new Uint8Array([0, 0, 0, 0]),
      },
      1234,
    ])
  })

  it('should parse ipv6 with port', () => {
    expect(ip.parseWithPort('[::1]:1234')).toEqual([
      {
        type: 'ipv6',
        parts: new Uint16Array([0, 0, 0, 0, 0, 0, 0, 1]),
      },
      1234,
    ])
  })

  it('should throw on a missing closing bracket', () => {
    expect(() => ip.parseWithPort('[2001:db8::1:443')).toThrow('Invalid address with port')
  })

  it('should throw when there is no colon', () => {
    expect(() => ip.parseWithPort('1234')).toThrow('Invalid address with port')
  })

  it('should throw on unbracketed ipv6 without a port', () => {
    expect(() => ip.parseWithPort('2001:db8::1')).toThrow('Invalid IPv6 address')
  })

  it('should parse unbracketed ipv6 using the last colon as the port', () => {
    expect(ip.parseWithPort('2001:db8::1:443')).toEqual([
      {
        type: 'ipv6',
        parts: new Uint16Array([0x2001, 0xDB8, 0, 0, 0, 0, 0, 1]),
      },
      443,
    ])
    expect(ip.parseWithPort('::1:443')).toEqual([
      {
        type: 'ipv6',
        parts: new Uint16Array([0, 0, 0, 0, 0, 0, 0, 1]),
      },
      443,
    ])
  })
})

describe('stringify', () => {
  it('should stringify ipv4', () => {
    expect(ip.stringify({
      type: 'ipv4',
      parts: new Uint8Array([127, 0, 0, 1]),
    })).toBe('127.0.0.1')
  })

  it('should stringify ipv6', () => {
    expect(ip.stringify({
      type: 'ipv6',
      parts: new Uint16Array([0, 0, 0, 0, 0, 0, 0, 1]),
    })).toBe('::1')
  })
})

describe('stringifyWithPort', () => {
  it('should stringify ipv4 with port', () => {
    expect(ip.stringifyWithPort({
      type: 'ipv4',
      parts: new Uint8Array([127, 0, 0, 1]),
    }, 1234)).toBe('127.0.0.1:1234')
  })

  it('should stringify ipv6 with port in brackets', () => {
    expect(ip.stringifyWithPort({
      type: 'ipv6',
      parts: new Uint16Array([0x2001, 0xDB8, 0, 0, 0, 0, 0, 1]),
    }, 443)).toBe('[2001:db8::1]:443')
  })
})
