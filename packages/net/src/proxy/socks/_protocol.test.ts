import { utf8 } from '@fuman/utils'
import { describe, expect, it } from 'vitest'

import {
    buildSocks4Connect,
    buildSocks5Auth,
    buildSocks5Connect,
    buildSocks5Greeting,
} from './_protocol.js'

describe('buildSocks4Connect', () => {
    it('should build a socks4 connect request', () => {
        const buf = buildSocks4Connect({
            address: '127.0.0.1',
            port: 8080,
        })
        expect(buf).toEqual(new Uint8Array([
            0x04, // VER
            0x01, // CMD
            0x1F, // port
            0x90,
            127, // ip
            0,
            0,
            1,
            0x00, // username (empty)
        ]))
    })

    it('should build a socks4 connect request with a username', () => {
        const buf = buildSocks4Connect({
            address: '127.0.0.1',
            port: 8080,
        }, 'fuman')

        expect(buf).toEqual(new Uint8Array([
            0x04, // VER
            0x01, // CMD
            0x1F, // port
            0x90,
            127, // ip
            0,
            0,
            1,
            // username
            ...utf8.encoder.encode('fuman'),
            0x00,
        ]))
    })

    it('should build a socks4 connect request with a hostname', () => {
        const buf = buildSocks4Connect({
            address: 'example.com',
            port: 8080,
        })

        expect(buf).toEqual(new Uint8Array([
            0x04, // VER
            0x01, // CMD
            0x1F, // port
            0x90,
            0, // ip
            0,
            0,
            42,
            0x00, // username (empty)
            // hostname
            ...utf8.encoder.encode('example.com'),
            0x00,
        ]))
    })
})

describe('buildSocks5Greeting', () => {
    it('should build a socks5 greeting without auth', () => {
        const buf = buildSocks5Greeting(false)

        expect(buf).toEqual(new Uint8Array([
            0x05, // VER
            0x01, // NAUTH
            0x00, // No auth
        ]))
    })

    it('should build a socks5 greeting with auth', () => {
        const buf = buildSocks5Greeting(true)

        expect(buf).toEqual(new Uint8Array([
            0x05, // VER
            0x02, // NAUTH
            0x00, // No auth
            0x02, // Username/password
        ]))
    })
})

describe('buildSocks5Auth', () => {
    it('should build a socks5 auth', () => {
        const buf = buildSocks5Auth('fuman', 'password')

        expect(buf).toEqual(new Uint8Array([
            0x01, // VER of auth
            0x05, // username length
            ...utf8.encoder.encode('fuman'),
            0x08, // password length
            ...utf8.encoder.encode('password'),
        ]))
    })

    it('should throw if username is too long', () => {
        expect(() => buildSocks5Auth('fuman'.repeat(256), 'password')).toThrow(TypeError)
    })

    it('should throw if password is too long', () => {
        expect(() => buildSocks5Auth('fuman', 'password'.repeat(256))).toThrow(TypeError)
    })
})

describe('buildSocks5Connect', () => {
    it('should build a socks5 connect to ipv4', () => {
        const buf = buildSocks5Connect({
            address: '127.0.0.1',
            port: 8080,
        })

        expect(buf).toEqual(new Uint8Array([
            0x05, // VER
            0x01, // CMD
            0x00, // RSV
            0x01, // TYPE = IPv4
            127, // ADDR
            0,
            0,
            1,
            0x1F, // PORT
            0x90,
        ]))
    })

    it('should build a socks5 connect to ipv6', () => {
        const buf = buildSocks5Connect({
            address: '::1',
            port: 8080,
        })

        expect(buf).toEqual(new Uint8Array([
            0x05, // VER
            0x01, // CMD
            0x00, // RSV
            0x04, // TYPE = IPv6
            // ADDR
            ...Array.from<number>({ length: 15 }).fill(0),
            1,
            0x1F, // PORT
            0x90,
        ]))
    })

    it('should build a socks5 connect to hostname', () => {
        const buf = buildSocks5Connect({
            address: 'example.com',
            port: 8080,
        })

        expect(buf).toEqual(new Uint8Array([
            0x05, // VER
            0x01, // CMD
            0x00, // RSV
            0x03, // TYPE = domain name
            0x0B, // ADDR (length)
            ...utf8.encoder.encode('example.com'),
            0x1F, // PORT
            0x90,
        ]))
    })

    it('should throw if hostname is too long', () => {
        expect(() => buildSocks5Connect({
            address: 'example.com'.repeat(256),
            port: 8080,
        })).toThrow(TypeError)
    })
})
