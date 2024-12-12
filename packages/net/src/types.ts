import type { IClosable, IReadable, IWritable } from '@fuman/io'

export interface IConnection<Address, LocalAddress = Address> extends IReadable, IWritable, IClosable {
    /** local address of the connection (if available) */
    readonly localAddress: LocalAddress | null
    /** remote address of the connection (if available) */
    readonly remoteAddress: Address | null
}

/** a TCP endpoint */
export interface TcpEndpoint {
    /** address of the endpoint */
    readonly address: string
    /** port of the endpoint */
    readonly port: number
}

/** common TLS options */
export interface TlsOptions {
    /**
     * List of CA certificates to use.
     * Will replace whatever is in the default platform CA store.
     */
    readonly caCerts?: string[]
    /** List of ALPN protocols to accept/offer */
    readonly alpnProtocols?: string[]
    /** Hostname to use for SNI */
    readonly sni?: string
}

/** TLS options for connecting to an endpoint */
export interface TlsConnectOptions extends TcpEndpoint, TlsOptions {}

/** TLS options for listening on an endpoint */
export interface TlsListenOptions extends TcpEndpoint, TlsOptions {
    readonly key?: string
    readonly cert?: string

    readonly hosts?: Omit<this, 'hosts' | 'address' | 'port'>[]
}

/** a TCP connection */
export interface ITcpConnection extends IConnection<TcpEndpoint> {
    /** set no-delay flag on the connection */
    setNoDelay: (noDelay: boolean) => void
    /** set keep-alive flag on the connection */
    setKeepAlive: (keepAlive: boolean) => void
}

/** a TLS connection */
export interface ITlsConnection extends ITcpConnection {
    /** get the ALPN protocol that was negotiated in the handshake */
    getAlpnProtocol: () => string | null
}

/** a listener for connections */
export interface IListener<Address, Connection extends IConnection<Address> = IConnection<Address>> extends IClosable {
    /** address of the listener (if available) */
    readonly address: Address | null

    /** accept a new connection */
    accept: () => Promise<Connection>
}

export type ListenFunction<
    Options,
    Listener extends IListener<unknown>,
> = (options: Options) => Promise<Listener>

export type ConnectFunction<
    Options,
    Connection extends IConnection<unknown>,
> = (options: Options) => Promise<Connection>

export type TlsUpgradeFunction<
    Options,
    TcpConnection extends ITcpConnection,
    TlsConnection extends ITlsConnection,
> = (tcpConn: TcpConnection, options: Options) => Promise<TlsConnection>
