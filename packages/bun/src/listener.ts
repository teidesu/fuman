import type { IListener, TcpEndpoint } from '@fuman/net'
import type { TCPSocketListener } from 'bun'
import { Deferred } from '@fuman/utils'

import { TcpConnection } from './connection.js'

export class TcpListener implements IListener<TcpEndpoint, TcpConnection> {
    constructor() {}

    #listener!: TCPSocketListener
    #waiter?: Deferred<TcpConnection>

    /** listen on the given endpoint; must be called before any other methods */
    listen(endpoint: TcpEndpoint): void {
        this.#listener = Bun.listen<TcpConnection>({
            hostname: endpoint.address,
            port: endpoint.port,
            socket: {
                open: (socket) => {
                    if (!this.#waiter) {
                        socket.end()
                        return
                    }

                    const conn = TcpConnection.from(socket)
                    socket.data = conn

                    this.#waiter.resolve(conn)
                    this.#waiter = undefined
                },
                error: (socket, error) => {
                    if (this.#waiter) {
                        this.#waiter.reject(error)
                        this.#waiter = undefined
                        return
                    }

                    socket.data?._handleError(socket, error)
                },
                data: (socket, data) => {
                    socket.data._handleData(socket, data)
                },
                drain: (socket) => {
                    socket.data._handleDrain()
                },
                close: (socket) => {
                    socket.data._handleClose()
                },
            },
        })
    }

    close(): void {
        this.#listener.stop()
    }

    get address(): TcpEndpoint {
        return {
            address: this.#listener.hostname,
            port: this.#listener.port,
        }
    }

    async accept(): Promise<TcpConnection> {
        this.#waiter = new Deferred()

        const connection = await this.#waiter.promise
        this.#waiter = undefined

        return connection
    }
}
