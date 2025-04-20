import type { IConnection, IListener, TcpEndpoint } from '@fuman/net'
import type { AddressInfo, Socket, Server as TcpServer } from 'node:net'

import type { Server as TlsServer } from 'node:tls'
import { ListenerClosedError } from '@fuman/net'
import { Deferred } from '@fuman/utils'

import { TcpConnection, TlsConnection } from './connection.js'

abstract class NodeListener<
  Server extends TcpServer | TlsServer,
  Address,
  Connection extends IConnection<Address>,
> implements IListener<Address, Connection> {
  #closed = false
  protected _waiter?: Deferred<Connection>

  protected abstract mapAddress(address: AddressInfo | string | null): Address

  constructor(
    /** Underlying server */
    readonly server: Server,
  ) {
    server.on('close', () => {
      this._waiter?.reject(new ListenerClosedError())
    })

    server.on('error', (error) => {
      this._waiter?.reject(error)
    })
  }

  get address(): Address {
    return this.mapAddress(this.server.address())
  }

  async accept(): Promise<Connection> {
    if (this.#closed) {
      throw new ListenerClosedError()
    }

    this._waiter = new Deferred()

    const connection = await this._waiter.promise
    this._waiter = undefined

    return connection
  }

  close(): void {
    this._waiter?.reject(new ListenerClosedError())
    this._waiter = undefined

    this.server.close()
  }
}

export class TcpListener extends NodeListener<TcpServer, TcpEndpoint, TcpConnection> {
  constructor(readonly server: TcpServer) {
    super(server)

    server.on('connection', (socket) => {
      if (!this._waiter) {
        socket.destroy()

        return
      }

      this._waiter.resolve(new TcpConnection(socket))
      this._waiter = undefined
    })
  }

  mapAddress(addr: AddressInfo | string | null): TcpEndpoint {
    if (addr === null || typeof addr === 'string') {
      throw new Error('listener is not bound')
    }

    return {
      address: addr.address,
      port: addr.port,
    }
  }

  mapConnection(socket: Socket): TcpConnection {
    return new TcpConnection(socket)
  }
}

export class TlsListener extends NodeListener<TlsServer, TcpEndpoint, TlsConnection> {
  constructor(readonly server: TlsServer) {
    super(server)

    server.on('secureConnection', (socket) => {
      if (!this._waiter) {
        socket.destroy()

        return
      }

      this._waiter.resolve(new TlsConnection(socket))
      this._waiter = undefined
    })
  }

  mapAddress(addr: AddressInfo | string | null): TcpEndpoint {
    if (addr === null || typeof addr === 'string') {
      throw new Error('listener is not bound')
    }

    return {
      address: addr.address,
      port: addr.port,
    }
  }
}
