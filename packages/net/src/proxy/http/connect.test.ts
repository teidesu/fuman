import type { TcpEndpoint } from '../../types.js'
import { Bytes } from '@fuman/io'

import { utf8 } from '@fuman/utils'
import { describe, expect, it } from 'vitest'

import { buildConnectRequest } from './_protocol.js'
import { performHttpProxyHandshake } from './connect.js'
import { HttpProxyConnectionError, type HttpProxySettings } from './types.js'

describe('performSocksHandshake', () => {
    const endpoint: TcpEndpoint = {
        address: '127.0.0.1',
        port: 8080,
    }

    const proxy = {
        host: '127.0.0.1',
        port: 1080,
        user: 'user',
    } satisfies HttpProxySettings

    it('should handle simple response', async () => {
        const tx = Bytes.alloc()
        const rx = Bytes.from(
            utf8.encoder.encode([
                'HTTP/1.1 200 Connection established',
                '',
                '',
            ].join('\r\n')),
        )

        await performHttpProxyHandshake(rx, tx, proxy, endpoint)

        expect(tx.result()).toEqual(buildConnectRequest(proxy, endpoint))
        expect(rx.available).toBe(0)
    })

    it('should handle simple response with http/1.0', async () => {
        const tx = Bytes.alloc()
        const rx = Bytes.from(
            utf8.encoder.encode([
                'HTTP/1.0 200 Connection established',
                '',
                '',
            ].join('\r\n')),
        )

        await performHttpProxyHandshake(rx, tx, proxy, endpoint)

        expect(tx.result()).toEqual(buildConnectRequest(proxy, endpoint))
        expect(rx.available).toBe(0)
    })

    it('should handle response with headers', async () => {
        const tx = Bytes.alloc()
        const rx = Bytes.from(
            utf8.encoder.encode([
                'HTTP/1.1 200 Connection established',
                'X-Whatever: value',
                '',
                '',
            ].join('\r\n')),
        )

        await performHttpProxyHandshake(rx, tx, proxy, endpoint)

        expect(tx.result()).toEqual(buildConnectRequest(proxy, endpoint))
        expect(rx.available).toBe(0)
    })

    it('should handle response with error', async () => {
        const tx = Bytes.alloc()
        const rx = Bytes.from(
            utf8.encoder.encode([
                'HTTP/1.1 403 Forbidden',
                'Server: whatever/1.2.3',
                '',
                '',
            ].join('\r\n')),
        )

        const promise = performHttpProxyHandshake(rx, tx, proxy, endpoint)

        await expect(promise).rejects.toThrow(HttpProxyConnectionError)
        expect(tx.result()).toEqual(buildConnectRequest(proxy, endpoint))
        expect(rx.available).toBe(38)
    })
})
