import { hex } from '@fuman/utils'

import { describe, expect, it } from 'vitest'

import { Bytes } from '../bytes.js'
import * as write from './strings.js'

describe('write/sync/strings', () => {
    describe('bytes', () => {
        it('should write bytes', () => {
            const c = Bytes.alloc()

            write.bytes(c, new Uint8Array([104, 101, 108, 108, 111]))

            expect(c.result()).toEqual(new Uint8Array([104, 101, 108, 108, 111]))
            expect(c.written).toBe(5)
        })
    })

    describe('bytesReversed', () => {
        it('should write bytes', () => {
            const c = Bytes.alloc()

            write.bytesReversed(c, new Uint8Array([104, 101, 108, 108, 111]))

            expect(c.result()).toEqual(new Uint8Array([111, 108, 108, 101, 104]))
            expect(c.written).toBe(5)
        })
    })

    describe('rawString', () => {
        it('should write a raw string', () => {
            const c = Bytes.alloc()

            write.rawString(c, 'hello')

            expect(c.result()).toEqual(new Uint8Array([104, 101, 108, 108, 111]))
            expect(c.written).toBe(5)
        })
    })

    describe('utf8String', () => {
        it('should write a utf8 string', () => {
            const c = Bytes.alloc()

            write.utf8String(c, '🌸')

            expect(c.written).toBe(4)
            expect(c.result()).toStrictEqual(new Uint8Array([0xF0, 0x9F, 0x8C, 0xB8]))
        })
    })

    describe('cUtf8String', () => {
        it('should write a c utf8 string', () => {
            const c = Bytes.alloc()

            write.cUtf8String(c, '🌸')

            expect(c.written).toBe(5)
            expect(c.result()).toStrictEqual(new Uint8Array([0xF0, 0x9F, 0x8C, 0xB8, 0]))
        })
    })

    describe('utf16beString', () => {
        const test = (str: string, expected: string) => {
            const c = Bytes.alloc()
            write.utf16beString(c, str)
            expect(c.written).toBe(expected.length / 2)
            expect(c.result()).toStrictEqual(hex.decode(expected))
        }

        it('should read a utf16be string', () => {
            test('meow', '006d0065006f0077')
            test('🙏', 'd83dde4f')
            test('我爱北京天安门', '6211723153174eac59295b8995e8')
        })
    })

    describe('utf16leString', () => {
        const test = (str: string, expected: string) => {
            const c = Bytes.alloc()
            write.utf16leString(c, str)
            expect(c.written).toBe(expected.length / 2)
            expect(c.result()).toStrictEqual(hex.decode(expected))
        }

        it('should read a utf16be string', () => {
            test('meow', '6d0065006f007700')
            test('🙏', '3dd84fde')
            test('我爱北京天安门', '116231721753ac4e2959895be895')
        })
    })
})
