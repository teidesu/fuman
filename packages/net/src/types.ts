import type { IClosable, IReadable, IWritable } from '@fuman/io'

export interface IConnection<Address, LocalAddress = Address> extends IReadable, IWritable, IClosable {
    readonly localAddress: LocalAddress | null
    readonly remoteAddress: Address | null
}

export interface TcpEndpoint {
    readonly address: string
    readonly port: number
}

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

export interface TlsConnectOptions extends TcpEndpoint, TlsOptions {}

export interface TlsListenOptions extends TcpEndpoint, TlsOptions {
    readonly key?: string
    readonly cert?: string

    readonly hosts?: Omit<this, 'hosts' | 'address' | 'port'>[]
}

export interface ITcpConnection extends IConnection<TcpEndpoint> {
    setNoDelay: (noDelay: boolean) => void
    setKeepAlive: (keepAlive: boolean) => void
}

export interface ITlsConnection extends ITcpConnection {
    getAlpnProtocol: () => string | null
}

export interface IListener<Address, Connection extends IConnection<Address> = IConnection<Address>> extends IClosable {
    readonly address: Address | null

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
