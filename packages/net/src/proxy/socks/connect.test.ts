import type { TcpEndpoint } from '../../types.js'
import type { SocksProxySettings } from './types.js'

import { Bytes } from '@fuman/io'

import { describe, expect, it } from 'vitest'
import { buildSocks4Connect, buildSocks5Auth, buildSocks5Connect, buildSocks5Greeting } from './_protocol.js'
import { performSocksHandshake } from './connect.js'
import { SocksProxyConnectionError } from './types.js'

describe('performSocksHandshake', () => {
  const endpoint: TcpEndpoint = {
    address: '127.0.0.1',
    port: 8080,
  }

  describe('socks4', () => {
    const proxy = {
      host: '127.0.0.1',
      port: 1080,
      user: 'user',
      version: 4,
    } satisfies SocksProxySettings

    it('should connect without auth', async () => {
      const tx = Bytes.alloc()
      const rx = Bytes.from(
        // connect response
        new Uint8Array([0x00, 0x5A, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
      )

      await performSocksHandshake(rx, tx, proxy, endpoint)

      expect(tx.result()).toEqual(buildSocks4Connect(endpoint, proxy.user))
      expect(rx.available).toBe(0)
    })

    it('should handle incorrect response', async () => {
      const tx = Bytes.alloc()
      const rx = Bytes.from(new Uint8Array([0x01, 0x5A, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]))

      const promise = performSocksHandshake(rx, tx, proxy, endpoint)

      await expect(promise).rejects.toThrow(SocksProxyConnectionError)
      expect(tx.result()).toEqual(buildSocks4Connect(endpoint, proxy.user))
      expect(rx.available).toBe(0)
    })

    it('should handle incorrect response code', async () => {
      const tx = Bytes.alloc()
      const rx = Bytes.from(new Uint8Array([0x00, 0x5B, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]))

      const promise = performSocksHandshake(rx, tx, proxy, endpoint)

      await expect(promise).rejects.toThrow(SocksProxyConnectionError)
      expect(tx.result()).toEqual(buildSocks4Connect(endpoint, proxy.user))
      expect(rx.available).toBe(0)
    })
  })

  describe('socks5', () => {
    const proxy = {
      host: '127.0.0.1',
      port: 1080,
      user: 'user',
      password: 'pass',
    } satisfies SocksProxySettings

    it('should connect without auth', async () => {
      const tx = Bytes.alloc()
      const rx = Bytes.from(new Uint8Array([
        // greeting (v5, no auth)
        ...[0x05, 0x00],
        // connect response
        ...[0x05, 0x00, 0x00, 0x00, 0x00, 0x00],
      ]))

      await performSocksHandshake(rx, tx, proxy, endpoint)

      expect(tx.result()).toEqual(new Uint8Array([
        ...buildSocks5Greeting(true),
        ...buildSocks5Connect(endpoint),
      ]))
      expect(rx.available).toBe(0)
    })

    it('should connect with auth', async () => {
      const tx = Bytes.alloc()
      const rx = Bytes.from(new Uint8Array([
        // greeting (v5, need auth)
        ...[0x05, 0x02],
        // auth response
        ...[0x01, 0x00],
        // connect response
        ...[0x05, 0x00, 0x00, 0x00, 0x00, 0x00],
      ]))

      await performSocksHandshake(rx, tx, proxy, endpoint)

      expect(tx.result()).toEqual(new Uint8Array([
        ...buildSocks5Greeting(true),
        ...buildSocks5Auth(proxy.user, proxy.password),
        ...buildSocks5Connect(endpoint),
      ]))
      expect(rx.available).toBe(0)
    })

    it('should handle incorrect greeting version', async () => {
      const tx = Bytes.alloc()
      const rx = Bytes.from(new Uint8Array([
        // greeting (wrong version)
        ...[0x06, 0x02],
        // auth response
        ...[0x01, 0x00],
        // connect response
        ...[0x05, 0x00, 0x00, 0x00, 0x00, 0x00],
      ]))

      const promise = performSocksHandshake(rx, tx, proxy, endpoint)

      await expect(promise).rejects.toThrow(SocksProxyConnectionError)
      expect(tx.result()).toEqual(new Uint8Array([
        ...buildSocks5Greeting(true),
      ]))
      expect(rx.available).toBe(8)
    })

    it('should handle incorrect greeting auth method', async () => {
      const tx = Bytes.alloc()
      const rx = Bytes.from(new Uint8Array([
        // greeting (wrong auth method)
        ...[0x05, 0x42],
        // auth response
        ...[0x01, 0x00],
        // connect response
        ...[0x05, 0x00, 0x00, 0x00, 0x00, 0x00],
      ]))

      const promise = performSocksHandshake(rx, tx, proxy, endpoint)

      await expect(promise).rejects.toThrow(SocksProxyConnectionError)
      expect(tx.result()).toEqual(new Uint8Array([
        ...buildSocks5Greeting(true),
      ]))
      expect(rx.available).toBe(8)
    })

    it('should handle incorrect auth response version', async () => {
      const tx = Bytes.alloc()
      const rx = Bytes.from(new Uint8Array([
        // greeting (v5, need auth)
        ...[0x05, 0x02],
        // auth response (wrong version)
        ...[0x02, 0x00],
        // connect response
        ...[0x05, 0x00, 0x00, 0x00, 0x00, 0x00],
      ]))

      const promise = performSocksHandshake(rx, tx, proxy, endpoint)

      await expect(promise).rejects.toThrow(SocksProxyConnectionError)
      expect(tx.result()).toEqual(new Uint8Array([
        ...buildSocks5Greeting(true),
        ...buildSocks5Auth(proxy.user, proxy.password),
      ]))
      expect(rx.available).toBe(6)
    })

    it('should handle incorrect auth response code', async () => {
      const tx = Bytes.alloc()
      const rx = Bytes.from(new Uint8Array([
        // greeting (v5, need auth)
        ...[0x05, 0x02],
        // auth response (wrong code)
        ...[0x01, 0x42],
        // connect response
        ...[0x05, 0x00, 0x00, 0x00, 0x00, 0x00],
      ]))

      const promise = performSocksHandshake(rx, tx, proxy, endpoint)

      await expect(promise).rejects.toThrow(SocksProxyConnectionError)
      expect(tx.result()).toEqual(new Uint8Array([
        ...buildSocks5Greeting(true),
        ...buildSocks5Auth(proxy.user, proxy.password),
      ]))
      expect(rx.available).toBe(6)
    })

    it('should handle incorrect connect response version', async () => {
      const tx = Bytes.alloc()
      const rx = Bytes.from(new Uint8Array([
        // greeting (v5, no auth)
        ...[0x05, 0x00],
        // connect response (wrong version)
        ...[0x06, 0x00, 0x00, 0x00, 0x00, 0x00],
      ]))

      const promise = performSocksHandshake(rx, tx, proxy, endpoint)

      await expect(promise).rejects.toThrow(SocksProxyConnectionError)
      expect(tx.result()).toEqual(new Uint8Array([
        ...buildSocks5Greeting(true),
        ...buildSocks5Connect(endpoint),
      ]))
      expect(rx.available).toBe(2)
    })

    it('should handle incorrect connect response code', async () => {
      const tx = Bytes.alloc()
      const rx = Bytes.from(new Uint8Array([
        // greeting (v5, no auth)
        ...[0x05, 0x00],
        // connect response (wrong code)
        ...[0x00, 0x42, 0x00, 0x00, 0x00, 0x00],
      ]))

      const promise = performSocksHandshake(rx, tx, proxy, endpoint)

      await expect(promise).rejects.toThrow(SocksProxyConnectionError)
      expect(tx.result()).toEqual(new Uint8Array([
        ...buildSocks5Greeting(true),
        ...buildSocks5Connect(endpoint),
      ]))
      expect(rx.available).toBe(2)
    })

    it('should handle incorrect BNDADDR type', async () => {
      const tx = Bytes.alloc()
      const rx = Bytes.from(new Uint8Array([
        // greeting (v5, no auth)
        ...[0x05, 0x00],
        // connect response (wrong BNDADDR type)
        ...[0x05, 0x00, 0x00, 0x42, 0x00, 0x00],
      ]))

      const promise = performSocksHandshake(rx, tx, proxy, endpoint)

      await expect(promise).rejects.toThrow(SocksProxyConnectionError)
      expect(tx.result()).toEqual(new Uint8Array([
        ...buildSocks5Greeting(true),
        ...buildSocks5Connect(endpoint),
      ]))
      expect(rx.available).toBe(2)
    })

    it('should handle ipv4 BNDADDR', async () => {
      const tx = Bytes.alloc()
      const rx = Bytes.from(new Uint8Array([
        // greeting (v5, no auth)
        ...[0x05, 0x00],
        // connect response (ipv4 BNDADDR)
        ...[0x05, 0x00, 0x00, 0x01, 1, 2, 3, 4, 0x00, 0x00],
      ]))

      await performSocksHandshake(rx, tx, proxy, endpoint)

      expect(tx.result()).toEqual(new Uint8Array([
        ...buildSocks5Greeting(true),
        ...buildSocks5Connect(endpoint),
      ]))
      expect(rx.available).toBe(0)
    })

    it('should handle ipv6 BNDADDR', async () => {
      const tx = Bytes.alloc()
      const rx = Bytes.from(new Uint8Array([
        // greeting (v5, no auth)
        ...[0x05, 0x00],
        // connect response (ipv6 BNDADDR)
        ...[0x05, 0x00, 0x00, 0x04, ...Array.from<number>({ length: 18 }).fill(0x42)],
      ]))

      await performSocksHandshake(rx, tx, proxy, endpoint)

      expect(tx.result()).toEqual(new Uint8Array([
        ...buildSocks5Greeting(true),
        ...buildSocks5Connect(endpoint),
      ]))
      expect(rx.available).toBe(0)
    })
  })
})
