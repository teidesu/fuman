import type { ConnectFunction, ListenFunction, TcpEndpoint, TlsConnectOptions } from '@fuman/net'

import { TcpConnection, TlsConnection } from './connection.js'
import { TcpListener } from './listener.js'

export const connectTcp: ConnectFunction<TcpEndpoint, TcpConnection> = async ({ address, port }) => {
    const conn = await Deno.connect({ port, hostname: address })
    return new TcpConnection(conn)
}

export const connectTls: ConnectFunction<TlsConnectOptions, TlsConnection> = async (opts) => {
    if (opts.sni != null) {
        throw new Error('.sni is not available in Deno')
    }

    const conn = await Deno.connectTls({
        hostname: opts.address,
        port: opts.port,
        caCerts: opts.caCerts,
        alpnProtocols: opts.alpnProtocols,
    })
    const handshake = await conn.handshake()

    return new TlsConnection(conn, handshake)
}

export const listenTcp: ListenFunction<TcpEndpoint, TcpListener> = async ({ address, port }) => {
    const listener = Deno.listen({ port, hostname: address, transport: 'tcp' })

    return new TcpListener(listener)
}

// todo: listenTls, upgradeTls
