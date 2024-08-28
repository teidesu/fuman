import { describe, expect, it } from 'vitest'

import { hex } from '../encodings/index.js'

import { fromBytes, toBytes } from './bytes.js'

describe('toBytes', () => {
    it('should handle writing to BE', () => {
        expect([...toBytes(BigInt('10495708'), 0, false)]).eql([0xA0, 0x26, 0xDC])
        expect([...toBytes(BigInt('10495708'), 4, false)]).eql([0x00, 0xA0, 0x26, 0xDC])
        expect([...toBytes(BigInt('10495708'), 8, false)]).eql([0x00, 0x00, 0x00, 0x00, 0x00, 0xA0, 0x26, 0xDC])
        expect([...toBytes(BigInt('3038102549'), 4, false)]).eql([0xB5, 0x15, 0xC4, 0x15])
        expect([...toBytes(BigInt('9341376580368336208'), 8, false)]).eql([
            ...hex.decode('81A33C81D2020550'),
        ])
    })

    it('should handle writing to LE', () => {
        expect([...toBytes(BigInt('10495708'), 0, true)]).eql([0xDC, 0x26, 0xA0])
        expect([...toBytes(BigInt('10495708'), 4, true)]).eql([0xDC, 0x26, 0xA0, 0x00])
        expect([...toBytes(BigInt('10495708'), 8, true)]).eql([0xDC, 0x26, 0xA0, 0x00, 0x00, 0x00, 0x00, 0x00])
        expect([...toBytes(BigInt('3038102549'), 4, true)]).eql([0x15, 0xC4, 0x15, 0xB5])
        expect([...toBytes(BigInt('9341376580368336208'), 8, true)]).eql([
            ...hex.decode('81A33C81D2020550').reverse(),
        ])
    })

    it('should handle large integers', () => {
        const buf = hex.decode(
            '1a981ce8bf86bf4a1bd79c2ef829914172f8d0e54cb7ad807552d56977e1c946872e2c7bd77052be30e7e9a7a35c4feff848a25759f5f2f5b0e96538',
        )
        const num = BigInt(
            '0x1a981ce8bf86bf4a1bd79c2ef829914172f8d0e54cb7ad807552d56977e1c946872e2c7bd77052be30e7e9a7a35c4feff848a25759f5f2f5b0e96538',
        )

        expect([...toBytes(num, 0, false)]).eql([...buf])
        expect([...toBytes(num, 0, true)]).eql([...buf.reverse()])
    })
})

describe('fromBytes', () => {
    it('should handle reading BE', () => {
        expect(fromBytes(new Uint8Array([0xA0, 0x26, 0xDC]), false).toString()).eq('10495708')
        expect(fromBytes(new Uint8Array([0x00, 0xA0, 0x26, 0xDC]), false).toString()).eq('10495708')
        expect(fromBytes(new Uint8Array([0xB5, 0x15, 0xC4, 0x15]), false).toString()).eq('3038102549')
    })

    it('should handle reading LE', () => {
        expect(fromBytes(new Uint8Array([0xDC, 0x26, 0xA0]), true).toString()).eq('10495708')
        expect(fromBytes(new Uint8Array([0xDC, 0x26, 0xA0, 0x00]), true).toString()).eq('10495708')
        expect(fromBytes(new Uint8Array([0x15, 0xC4, 0x15, 0xB5]), true).toString()).eq('3038102549')
    })

    it('should handle large integers', () => {
        const buf = hex.decode(
            '1a981ce8bf86bf4a1bd79c2ef829914172f8d0e54cb7ad807552d56977e1c946872e2c7bd77052be30e7e9a7a35c4feff848a25759f5f2f5b0e96538',
        )
        const num = BigInt(
            '0x1a981ce8bf86bf4a1bd79c2ef829914172f8d0e54cb7ad807552d56977e1c946872e2c7bd77052be30e7e9a7a35c4feff848a25759f5f2f5b0e96538',
        )

        expect(fromBytes(buf, false).toString()).eq(num.toString())
        expect(fromBytes(buf.reverse(), true).toString()).eq(num.toString())
    })
})
