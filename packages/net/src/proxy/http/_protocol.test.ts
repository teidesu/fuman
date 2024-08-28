import { utf8 } from '@fuman/utils'
import { describe, expect, it } from 'vitest'

import { buildConnectRequest } from './_protocol.js'

describe('buildConnectRequest', () => {
    it('should build a request without auth', () => {
        const request = buildConnectRequest({
            host: '127.0.0.1',
            port: 8080,
        }, {
            address: '127.0.0.1',
            port: 8080,
        })

        expect(utf8.decoder.decode(request)).toEqual([
            'CONNECT 127.0.0.1:8080 HTTP/1.1',
            'Host: 127.0.0.1:8080',
            'User-Agent: @fuman/net',
            'Proxy-Connection: Keep-Alive',
            '',
            '',
        ].join('\r\n'))
    })

    it('should build an ipv6 request without auth', () => {
        const request = buildConnectRequest({
            host: '127.0.0.1',
            port: 8080,
        }, {
            address: '::1',
            port: 8080,
        })

        expect(utf8.decoder.decode(request)).toEqual([
            'CONNECT [::1]:8080 HTTP/1.1',
            'Host: [::1]:8080',
            'User-Agent: @fuman/net',
            'Proxy-Connection: Keep-Alive',
            '',
            '',
        ].join('\r\n'))
    })

    it('should build a request with auth', () => {
        const request = buildConnectRequest({
            host: '127.0.0.1',
            port: 8080,
            user: 'user',
            password: 'pass',
        }, {
            address: '127.0.0.1',
            port: 8080,
        })

        expect(utf8.decoder.decode(request)).toEqual([
            'CONNECT 127.0.0.1:8080 HTTP/1.1',
            'Host: 127.0.0.1:8080',
            'User-Agent: @fuman/net',
            'Proxy-Connection: Keep-Alive',
            'Proxy-Authorization: Basic dXNlcjpwYXNz',
            '',
            '',
        ].join('\r\n'))
    })

    it('should build a request with custom headers', () => {
        const request = buildConnectRequest({
            host: '127.0.0.1',
            port: 8080,
            headers: {
                'X-Header': 'value',
            },
        }, {
            address: '127.0.0.1',
            port: 8080,
        })

        expect(utf8.decoder.decode(request)).toEqual([
            'CONNECT 127.0.0.1:8080 HTTP/1.1',
            'Host: 127.0.0.1:8080',
            'User-Agent: @fuman/net',
            'Proxy-Connection: Keep-Alive',
            'X-Header: value',
            '',
            '',
        ].join('\r\n'))
    })
})
