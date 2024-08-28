import type { IClosable, IReadable, IWritable } from '@fuman/io'
import type { ITcpConnection, ITlsConnection, TcpEndpoint } from '@fuman/net'
import type { Socket } from 'node:net'

import type { TLSSocket } from 'node:tls'

import { Bytes } from '@fuman/io'
import { ConnectionClosedError } from '@fuman/net'
import { asNonNull, ConditionVariable, unknownToError } from '@fuman/utils'

export interface NodeConnectionOptions {
    bufferSize?: number
}

class NodeSocketConnection<Sock extends Socket | TLSSocket> implements IReadable, IWritable, IClosable {
    #error: Error | null = null
    #buffer: Bytes
    #cv = new ConditionVariable()

    constructor(readonly socket: Sock, options: NodeConnectionOptions = {}) {
        if (socket.pending) {
            throw new Error('socket is not connected')
        }
        if (socket.destroyed) {
            throw new Error('socket is destroyed')
        }

        this.#buffer = Bytes.alloc(options.bufferSize)

        socket.resume()
        socket.on('data', (data: Buffer) => {
            this.#buffer.writeSync(data.length).set(data)
            this.#cv.notify()
        })
        socket.on('close', () => {
            this.#error = new ConnectionClosedError()
            this.#cv.notify()
        })
        socket.on('error', (error: unknown) => {
            this.#error = unknownToError(error)
            this.#cv.notify()
        })
    }

    close(): void {
        this.socket?.destroy()
        this.#error = new ConnectionClosedError()
        this.#cv.notify()
    }

    async read(into: Uint8Array): Promise<number> {
        if (this.#buffer.available > 0) {
            // there's data in the buffer
            const size = Math.min(this.#buffer.available, into.length)
            into.set(this.#buffer.readSync(size))
            this.#buffer.reclaim()
            return size
        }

        if (this.#error !== null) throw this.#error
        await this.#cv.wait()
        if (this.#error !== null) throw this.#error

        const size = Math.min(this.#buffer.available, into.length)
        into.set(this.#buffer.readSync(size))
        this.#buffer.reclaim()
        return size
    }

    async write(bytes: Uint8Array): Promise<void> {
        if (this.#error) throw this.#error

        return new Promise<void>((resolve, reject) => {
            this.socket.write(bytes, (error) => {
                if (error) reject(error)
                else resolve()
            })
        })
    }
}

export class TcpConnection extends NodeSocketConnection<Socket> implements ITcpConnection {
    get localAddress(): TcpEndpoint {
        return {
            address: asNonNull(this.socket.localAddress),
            port: asNonNull(this.socket.localPort),
        }
    }

    get remoteAddress(): TcpEndpoint {
        return {
            address: asNonNull(this.socket.remoteAddress),
            port: asNonNull(this.socket.remotePort),
        }
    }

    setKeepAlive(keepAlive?: boolean): void {
        this.socket.setKeepAlive(keepAlive)
    }

    setNoDelay(noDelay?: boolean): void {
        this.socket.setNoDelay(noDelay)
    }
}

export class TlsConnection extends NodeSocketConnection<TLSSocket> implements ITlsConnection {
    get localAddress(): TcpEndpoint {
        return {
            address: asNonNull(this.socket.localAddress),
            port: asNonNull(this.socket.localPort),
        }
    }

    get remoteAddress(): TcpEndpoint {
        return {
            address: asNonNull(this.socket.remoteAddress),
            port: asNonNull(this.socket.remotePort),
        }
    }

    setKeepAlive(keepAlive?: boolean): void {
        this.socket.setKeepAlive(keepAlive)
    }

    setNoDelay(noDelay?: boolean): void {
        this.socket.setNoDelay(noDelay)
    }

    getAlpnProtocol(): string | null {
        const proto = this.socket.alpnProtocol
        if (proto === false) return null
        return proto
    }
}
