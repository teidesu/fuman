import { Bytes } from '@fuman/io'
import { describe, expect, it } from 'vitest'

import * as ip from './v6.js'

describe('ipv6', () => {
    describe('parseV6', () => {
        it.each([
            ['::1:2:3:4:5', new Uint16Array([0, 0, 0, 1, 2, 3, 4, 5])],
            ['0:0:0:1:2:3:4:5', new Uint16Array([0, 0, 0, 1, 2, 3, 4, 5])],
            ['1:2::3:4:5', new Uint16Array([1, 2, 0, 0, 0, 3, 4, 5])],
            ['1:2:0:0:0:3:4:5', new Uint16Array([1, 2, 0, 0, 0, 3, 4, 5])],
            ['[1:2:3:4:5::]', new Uint16Array([1, 2, 3, 4, 5, 0, 0, 0])],
            ['1:2:3:4:5:0:0:0', new Uint16Array([1, 2, 3, 4, 5, 0, 0, 0])],
            ['0:0:0:0:0:ffff:102:405', new Uint16Array([0, 0, 0, 0, 0, 0xFFFF, 0x102, 0x405])],
            ['::', new Uint16Array([0, 0, 0, 0, 0, 0, 0, 0])],
            ['[::]', new Uint16Array([0, 0, 0, 0, 0, 0, 0, 0])],
            ['::0', new Uint16Array([0, 0, 0, 0, 0, 0, 0, 0])],
            ['::1', new Uint16Array([0, 0, 0, 0, 0, 0, 0, 1])],
            ['[::1]', new Uint16Array([0, 0, 0, 0, 0, 0, 0, 1])],
            ['0:0:0::1', new Uint16Array([0, 0, 0, 0, 0, 0, 0, 1])],
            ['ffff::1', new Uint16Array([0xFFFF, 0, 0, 0, 0, 0, 0, 1])],
            ['ffff:0:0:0:0:0:0:1', new Uint16Array([0xFFFF, 0, 0, 0, 0, 0, 0, 1])],
            ['2001:0db8:0a0b:12f0:0:0:0:1', new Uint16Array([0x2001, 0x0DB8, 0x0A0B, 0x12F0, 0, 0, 0, 1])],
            ['2001:db8:a0b:12f0::1', new Uint16Array([0x2001, 0xDB8, 0xA0B, 0x12F0, 0, 0, 0, 1])],
            ['[2001:db8:a0b:12f0::1]', new Uint16Array([0x2001, 0xDB8, 0xA0B, 0x12F0, 0, 0, 0, 1])],
            ['[2001:db8:a0b:12f0::1]%eth0', new Uint16Array([0x2001, 0xDB8, 0xA0B, 0x12F0, 0, 0, 0, 1]), 'eth0'],
            ['[2001:db8:a0b:12f0::1%eth0]', new Uint16Array([0x2001, 0xDB8, 0xA0B, 0x12F0, 0, 0, 0, 1]), 'eth0'],
            ['::ffff:1.2.3.4', new Uint16Array([0, 0, 0, 0, 0, 0xFFFF, 0x0102, 0x0304])],
            ['::ffff:123.222.111.7', new Uint16Array([0, 0, 0, 0, 0, 0xFFFF, 0x7BDE, 0x6F07])],
        ])('parses "%s"', (...args) => {
            const [input, expected, expectedZoneId] = args

            expect(ip.parseV6(input)).toEqual({
                type: 'ipv6',
                parts: expected,
                zoneId: expectedZoneId,
            })
        })

        it('throws on multiple ::', () => {
            expect(() => ip.parseV6('2001:db8::85a3::8a2e:370:7334')).toThrow()
        })

        it('throws on too many parts', () => {
            expect(() => ip.parseV6('2001:db8:85a3::8a2e:370:7334:1234:1234:1234')).toThrow()
        })

        it('throws on too few parts', () => {
            expect(() => ip.parseV6('2001:db8:85a3:8a2e')).toThrow()
        })
    })

    describe('stringifyV6', () => {
        it('should stringify simple addresses', () => {
            expect(ip.stringifyV6({ type: 'ipv6', parts: new Uint16Array([1, 2, 3, 4, 5, 6, 7, 8]) })).toBe(
                '1:2:3:4:5:6:7:8',
            )
        })

        it('should compress zeroes by default', () => {
            expect(ip.stringifyV6({ type: 'ipv6', parts: new Uint16Array([0, 0, 0, 0, 0, 0, 0, 1]) })).toBe('::1')
            expect(ip.stringifyV6({ type: 'ipv6', parts: new Uint16Array([1, 0, 0, 0, 0, 0, 0, 0]) })).toBe('1::')
            expect(ip.stringifyV6({ type: 'ipv6', parts: new Uint16Array([1, 2, 0, 0, 0, 3, 4, 5]) })).toBe(
                '1:2::3:4:5',
            )
            expect(ip.stringifyV6({ type: 'ipv6', parts: new Uint16Array([0, 0, 0, 0, 0, 0, 0, 0]) })).toBe('::')
            expect(ip.stringifyV6({ type: 'ipv6', parts: new Uint16Array([0, 0, 0, 0, 0, 1, 0, 0]) })).toBe('::1:0:0')
            expect(ip.stringifyV6({ type: 'ipv6', parts: new Uint16Array([0, 0, 1, 0, 0, 0, 0, 0]) })).toBe('0:0:1::')
        })

        it('should use hex encoding', () => {
            expect(
                ip.stringifyV6({ type: 'ipv6', parts: new Uint16Array([0x2001, 0xDB8, 0xA0B, 0x12F0, 0, 0, 0, 1]) }),
            ).toBe('2001:db8:a0b:12f0::1')
        })

        it('should allow disabling zero compression', () => {
            expect(
                ip.stringifyV6(
                    { type: 'ipv6', parts: new Uint16Array([0, 0, 0, 0, 0, 0, 0, 1]) },
                    { zeroCompression: false },
                ),
            ).toBe('0:0:0:0:0:0:0:1')
        })

        it('should allow fixed length parts', () => {
            expect(
                ip.stringifyV6(
                    { type: 'ipv6', parts: new Uint16Array([1, 2, 3, 4, 5, 6, 7, 8]) },
                    { fixedLength: true },
                ),
            ).toBe('0001:0002:0003:0004:0005:0006:0007:0008')
        })
    })

    it('expandV6', () => {
        expect(ip.expandV6('2001:db8:85a3::8a2e:370:7334')).toBe('2001:db8:85a3:0:0:8a2e:370:7334')
    })

    describe('fromBytesV6', () => {
        it('should parse address from byte array', () => {
            expect(ip.fromBytesV6(new Uint8Array([0x20, 0x01, 0x0D, 0xB8, 0x85, 0xA3, 0, 0, 0, 0, 0x8A, 0x2E, 0x03, 0x70, 0x73, 0x34])).parts).toEqual(
                new Uint16Array([0x2001, 0x0DB8, 0x85A3, 0, 0, 0x8A2E, 0x0370, 0x7334]),
            )
        })

        it('should throw on invalid length', () => {
            expect(() => ip.fromBytesV6(new Uint8Array([0x20, 0x01, 0x0D, 0xB8, 0x85, 0xA3, 0, 0, 0, 0, 0x8A, 0x2E, 0x03, 0x70, 0x73]))).toThrow()
        })
    })

    describe('readV6', () => {
        it('should read address from a reader', () => {
            const bytes = Bytes.from(new Uint8Array([0x20, 0x01, 0x0D, 0xB8, 0x85, 0xA3, 0, 0, 0, 0, 0x8A, 0x2E, 0x03, 0x70, 0x73, 0x34]))
            expect(ip.readV6(bytes).parts).toEqual(new Uint16Array([0x2001, 0x0DB8, 0x85A3, 0, 0, 0x8A2E, 0x0370, 0x7334]))
        })
    })

    describe('toBytesV6', () => {
        it('should write address to byte array', () => {
            const parts = new Uint16Array([0x2001, 0x0DB8, 0x85A3, 0, 0, 0x8A2E, 0x0370, 0x7334])
            expect(ip.toBytesV6({ type: 'ipv6', parts })).toEqual(
                new Uint8Array([0x20, 0x01, 0x0D, 0xB8, 0x85, 0xA3, 0, 0, 0, 0, 0x8A, 0x2E, 0x03, 0x70, 0x73, 0x34]),
            )
        })
    })

    describe('writeV6', () => {
        it('should write address to a writer', () => {
            const bytes = Bytes.alloc()
            ip.writeV6({ type: 'ipv6', parts: new Uint16Array([0x2001, 0x0DB8, 0x85A3, 0, 0, 0x8A2E, 0x0370, 0x7334]) }, bytes)
            expect(bytes.result()).toEqual(new Uint8Array([0x20, 0x01, 0x0D, 0xB8, 0x85, 0xA3, 0, 0, 0, 0, 0x8A, 0x2E, 0x03, 0x70, 0x73, 0x34]))
        })
    })
})
