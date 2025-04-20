import type { IListener, IWebSocketServerConnection, IWebSocketServerConnectionFramed, TcpEndpoint } from '@fuman/net'
import type { IncomingMessage } from 'node:http'
import type { Duplex } from 'node:stream'
import type { ServerOptions, WebSocket } from 'ws'
import { Bytes } from '@fuman/io'
import { ConnectionClosedError, ListenerClosedError, WebSocketConnectionClosedError } from '@fuman/net'
import { ConditionVariable, Deferred, Deque } from '@fuman/utils'
import { WebSocketServer } from 'ws'

// todo: a bunch of this code is duplicated in the browser version, maybe we can somehow refactor it?

abstract class NodeWebSocketConnectionBase {
  protected _error: Error | null = null
  protected _cv: ConditionVariable = new ConditionVariable()

  abstract onMessage(data: Buffer, isBinary: boolean): void

  constructor(
    readonly socket: WebSocket,
    readonly request: IncomingMessage,
  ) {
    socket.binaryType = 'nodebuffer'
    socket.on('message', (data, isBinary) => {
      const data_ = data as Buffer
      this.onMessage(data_, isBinary)

      this._cv.notify()
    })
    socket.on('close', (code, reason) => {
      if (this._error) return // already closed
      this._error = new WebSocketConnectionClosedError(code, reason.toString('utf-8'))
      this._cv.notify()
    })
    socket.on('error', (error) => {
      if (this._error) return // already closed
      this._error = error
      this._cv.notify()
    })
  }

  #headers?: Headers
  get headers(): Headers {
    if (!this.#headers) {
      const headers = new Headers()

      for (const [key, value] of Object.entries(this.request.headers)) {
        if (value == null) continue
        if (Array.isArray(value)) {
          for (const v of value) {
            headers.append(key, v)
          }
        } else {
          headers.set(key, value)
        }
      }

      this.#headers = headers
    }

    return this.#headers
  }

  get url(): string {
    return this.request.url ?? this.socket.url
  }

  get localAddress(): null {
    return null
  }

  get remoteAddress(): TcpEndpoint | null {
    if (this.request.socket.remoteAddress == null) return null

    return {
      address: this.request.socket.remoteAddress,
      port: this.request.socket.remotePort ?? 0,
    }
  }

  close(): void {
    this.socket.close()
    this._error = new ConnectionClosedError()
    this._cv.notify()
  }
}

class NodeWebSocketConnection extends NodeWebSocketConnectionBase implements IWebSocketServerConnection {
  #buffer = Bytes.alloc(0)

  onMessage(data: Buffer): void {
    this.#buffer.writeSync(data.length).set(data)
    this.#buffer.disposeWriteSync()
  }

  async read(into: Uint8Array): Promise<number> {
    if (this.#buffer.available > 0) {
      // there's data in the buffer
      const size = Math.min(this.#buffer.available, into.length)
      into.set(this.#buffer.readSync(size))
      this.#buffer.reclaim()
      return size
    }

    if (this._error !== null) throw this._error
    await this._cv.wait()
    if (this._error !== null) throw this._error

    const size = Math.min(this.#buffer.available, into.length)
    into.set(this.#buffer.readSync(size))
    this.#buffer.reclaim()
    return size
  }

  async write(bytes: Uint8Array): Promise<void> {
    if (this._error) throw this._error
    if (!bytes.length) return

    this.socket.send(bytes)
  }
}

class NodeWebSocketConnectionFramed extends NodeWebSocketConnectionBase implements IWebSocketServerConnectionFramed {
  #buffer: Deque<string | Uint8Array> = new Deque()

  onMessage(data: Buffer, isBinary: boolean): void {
    if (isBinary) {
      this.#buffer.pushBack(new Uint8Array(data.buffer, data.byteOffset, data.byteLength))
    } else {
      this.#buffer.pushBack(data.toString('utf-8'))
    }
  }

  async readFrame(): Promise<Uint8Array | string> {
    if (!this.#buffer.isEmpty()) {
      // eslint-disable-next-line ts/no-non-null-assertion
      return this.#buffer.popFront()!
    }

    if (this._error !== null) throw this._error
    await this._cv.wait()

    if (this._error !== null) throw this._error

    // eslint-disable-next-line ts/no-non-null-assertion
    return this.#buffer.popFront()!
  }

  async writeFrame(data: Uint8Array | string): Promise<void> {
    if (this._error) throw this._error

    this.socket.send(data)
  }
}

abstract class NodeWebSocketServerBase<Connection> {
  abstract makeConnection(socket: WebSocket, request: IncomingMessage): Connection

  #closed = false
  #waiter?: Deferred<Connection>

  constructor(
    /** Underlying server */
    readonly server: WebSocketServer,
  ) {
    server.on('connection', (socket, request) => {
      if (!this.#waiter) {
        socket.close()
        return
      }

      this.#waiter.resolve(this.makeConnection(socket, request))
      this.#waiter = undefined
    })

    server.on('error', (error) => {
      this.#waiter?.reject(error)
    })

    server.on('close', () => {
      this.#waiter?.reject(new ListenerClosedError())
    })
  }

  get address(): TcpEndpoint | null {
    const addr = this.server.address()
    if (addr == null) return null

    if (typeof addr === 'string') {
      const [host, port] = addr.split(':')
      return {
        address: host,
        port: Number.parseInt(port),
      }
    }

    return {
      address: addr.address,
      port: addr.port,
    }
  }

  close(): void {
    this.server.close()
  }

  async accept(): Promise<Connection> {
    if (this.#closed) {
      throw new ListenerClosedError()
    }

    this.#waiter = new Deferred()

    const connection = await this.#waiter.promise
    this.#waiter = undefined

    return connection
  }

  handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void {
    if (!this.#waiter) {
      socket.destroy()

      return
    }

    const waiter = this.#waiter
    this.#waiter = undefined

    this.server.handleUpgrade(req, socket, head, (socket, req2) => {
      waiter.resolve(this.makeConnection(socket, req2))
    })
  }
}

export class NodeWebSocketServer extends NodeWebSocketServerBase<NodeWebSocketConnection> implements IListener<TcpEndpoint, IWebSocketServerConnection> {
  makeConnection(socket: WebSocket, request: IncomingMessage): NodeWebSocketConnection {
    return new NodeWebSocketConnection(socket, request)
  }
}

export class NodeWebSocketServerFramed extends NodeWebSocketServerBase<NodeWebSocketConnectionFramed> {
  makeConnection(socket: WebSocket, request: IncomingMessage): NodeWebSocketConnectionFramed {
    return new NodeWebSocketConnectionFramed(socket, request)
  }
}

export function listenWs(options: ServerOptions): NodeWebSocketServer {
  return new NodeWebSocketServer(new WebSocketServer(options))
}

export function listenWsFramed(options: ServerOptions): NodeWebSocketServerFramed {
  return new NodeWebSocketServerFramed(new WebSocketServer(options))
}
