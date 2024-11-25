import { ConnectionClosedError, type ITcpConnection, type ITlsConnection, type TcpEndpoint } from '@fuman/net'

import { addrToTcpEndpoint } from './_utils.js'

class BaseConnection<Conn extends Deno.Conn> {
    constructor(readonly conn: Conn) {}

    async read(into: Uint8Array): Promise<number> {
        try {
            const read = await this.conn.read(into)
            if (read === null) return 0
            return read
        } catch (err) {
            if (err instanceof Deno.errors.BadResource || err instanceof Deno.errors.Interrupted) {
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
            if (err instanceof Deno.errors.BadResource || err instanceof Deno.errors.Interrupted) {
                throw new ConnectionClosedError()
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

export class TlsConnection extends BaseConnection<Deno.TlsConn> implements ITlsConnection {
    constructor(
        override readonly conn: Deno.TlsConn,
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
