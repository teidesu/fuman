import type { IClosable, IReadable, IWritable } from '@fuman/io'

import { ConnectionClosedError, type ITcpConnection, type ITlsConnection, type TcpEndpoint } from '@fuman/net'
import { addrToTcpEndpoint } from './_utils.js'

class BaseConnection<Conn extends Deno.Conn> implements IReadable, IWritable, IClosable {
    constructor(
        /** Underlying connection */
        readonly conn: Conn,
    ) {}

    async read(into: Uint8Array): Promise<number> {
        try {
            const read = await this.conn.read(into)
            // 0 or null don't mean the connection has ended, so we need to retry
            if (read === 0 || read === null) {
                // eslint-disable-next-line ts/return-await
                return this.read(into)
            }
            return read
        } catch (err) {
            if (
                err instanceof Deno.errors.BadResource
                || err instanceof Deno.errors.Interrupted
                || err instanceof Deno.errors.BrokenPipe
                || err instanceof Deno.errors.ConnectionReset
                || err instanceof Deno.errors.ConnectionRefused
                || err instanceof Deno.errors.ConnectionAborted
                || err instanceof Deno.errors.TimedOut
                || err instanceof Deno.errors.NetworkUnreachable
            ) {
                throw new ConnectionClosedError()
            } else {
                throw err
            }
        }
    }

    async write(bytes: Uint8Array): Promise<void> {
        try {
            let nwritten = 0
            while (nwritten < bytes.length) {
                nwritten += await this.conn.write(bytes.subarray(nwritten))
            }
        } catch (err) {
            if (
                err instanceof Deno.errors.BadResource
                || err instanceof Deno.errors.Interrupted
                || err instanceof Deno.errors.BrokenPipe
                || err instanceof Deno.errors.ConnectionReset
                || err instanceof Deno.errors.ConnectionRefused
                || err instanceof Deno.errors.ConnectionAborted
                || err instanceof Deno.errors.TimedOut
                || err instanceof Deno.errors.NetworkUnreachable
            ) {
                throw new ConnectionClosedError(err.message)
            } else {
                throw err
            }
        }
    }

    close(): void {
        try {
            this.conn.close()
        } catch (err) {
            if (!(err instanceof Deno.errors.BadResource)) {
                throw err
            }
        }
    }
}

/** An implementation of {@link ITcpConnection} using Deno's `connect` function */
export class TcpConnection extends BaseConnection<Deno.TcpConn> implements ITcpConnection {
    get localAddress(): TcpEndpoint {
        return addrToTcpEndpoint(this.conn.localAddr)
    }

    get remoteAddress(): TcpEndpoint {
        return addrToTcpEndpoint(this.conn.remoteAddr)
    }

    setKeepAlive(keepAlive?: boolean): void {
        this.conn.setKeepAlive(keepAlive)
    }

    setNoDelay(noDelay?: boolean): void {
        this.conn.setNoDelay(noDelay)
    }
}

/** An implementation of {@link ITlsConnection} using Deno's `connectTls` function */
export class TlsConnection extends BaseConnection<Deno.TlsConn> implements ITlsConnection {
    constructor(
        /** Underlying connection */
        override readonly conn: Deno.TlsConn,
        /** TLS handshake info (if available) */
        readonly handshake: Deno.TlsHandshakeInfo | null = null,
    ) {
        super(conn)
    }

    get localAddress(): TcpEndpoint {
        return addrToTcpEndpoint(this.conn.localAddr)
    }

    get remoteAddress(): TcpEndpoint {
        return addrToTcpEndpoint(this.conn.remoteAddr)
    }

    setKeepAlive(): void {
        throw new Error('Not available in Deno')
    }

    setNoDelay(): void {
        throw new Error('Not available in Deno')
    }

    getAlpnProtocol(): string | null {
        return this.handshake?.alpnProtocol ?? null
    }
}
