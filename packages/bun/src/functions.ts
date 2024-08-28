import type { ConnectFunction, IListener, ListenFunction, TcpEndpoint, TlsConnectOptions } from '@fuman/net'

import { TcpConnection } from './connection.js'
import { TcpListener } from './listener.js'

export const connectTcp: ConnectFunction<TcpEndpoint, TcpConnection> = async (endpoint) => {
    const connection = new TcpConnection()
    await connection.connect(endpoint)
    return connection
}

export const connectTls: ConnectFunction<TlsConnectOptions, TcpConnection> = async (opts) => {
    if (opts.sni != null) {
        throw new Error('.sni is not available in Bun')
    }
    if (opts.caCerts) {
        throw new Error('.caCerts is not available in Bun')
    }
    if (opts.alpnProtocols) {
        throw new Error('.alpnProtocols is not available in Bun')
    }

    const connection = new TcpConnection()
    await connection.connect(opts, true)
    return connection
}

export const listenTcp: ListenFunction<TcpEndpoint, IListener<TcpEndpoint>> = async (address) => {
    const listener = new TcpListener()
    listener.listen(address)
    return listener
}

// todo: listenTls, upgradeTls
