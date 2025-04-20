import type { ITcpConnection, ITlsConnection, TcpEndpoint } from '@fuman/net'
import type { UnsafeMutable } from '@fuman/utils'
import type { Socket } from 'bun'
import { Bytes } from '@fuman/io'
import { ConnectionClosedError } from '@fuman/net'
import { ConditionVariable, Deferred, Deque } from '@fuman/utils'

// NB: classes have better performance than tuples
class SendBufferItem {
  constructor(public bytes: Uint8Array, readonly deferred: Deferred<void>) {}
}

/**
 * Implementation of {@link ITcpConnection} and {@link ITlsConnection} interfaces
 * using Bun's `connect` function.
 */
export class TcpConnection implements ITcpConnection, ITlsConnection {
  /** Underlying socket */
  readonly socket!: Socket<any>
  #error: Error | null = null
  #recvBuffer = Bytes.alloc(1024 * 16)
  #sendBuffer: Deque<SendBufferItem> = new Deque()
  #cv = new ConditionVariable()
  #endpoint?: TcpEndpoint

  /** Connect to the given endpoint (must be called as the first thing before using the connection) */
  async connect(endpoint: TcpEndpoint, tls = false): Promise<void> {
    ;(this as UnsafeMutable<TcpConnection>).socket = await Bun.connect({
      hostname: endpoint.address,
      port: endpoint.port,
      socket: {
        data: this._handleData.bind(this),
        error: this._handleError.bind(this),
        close: this._handleClose.bind(this),
        drain: this._handleDrain.bind(this),
      },
      tls,
    })
    this.#endpoint = endpoint
  }

  /** Create a new TcpConnection from an existing socket */
  static from(socket: Socket<any>): TcpConnection {
    const conn = new TcpConnection()
        ;(conn as UnsafeMutable<TcpConnection>).socket = socket
    return conn
  }

  /** @internal */
  _handleData(_: unknown, data: Buffer): void {
    this.#recvBuffer.writeSync(data.length).set(data)
    this.#cv.notify()
  }

  /** @internal */
  _handleError(_: unknown, error: Error): void {
    this.#error = error
    this.#cv.notify()
  }

  /** @internal */
  _handleClose(): void {
    this.#error = new ConnectionClosedError()
    this.#cv.notify()
    for (const { deferred } of this.#sendBuffer) {
      deferred.reject(this.#error)
    }
  }

  /** @internal */
  _handleDrain(): void {
    while (!this.#sendBuffer.isEmpty()) {
      // eslint-disable-next-line ts/no-non-null-assertion
      const item = this.#sendBuffer.popFront()!
      const { bytes: chunk, deferred } = item
      const written = this.socket.write(chunk)

      if (written < chunk.length) {
        item.bytes = chunk.subarray(written)
        this.#sendBuffer.pushFront(item)
        break
      }

      deferred.resolve()
    }
  }

  async read(into: Uint8Array): Promise<number> {
    if (this.#recvBuffer.available > 0) {
      // there's data in the buffer
      const size = Math.min(this.#recvBuffer.available, into.length)
      into.set(this.#recvBuffer.readSync(size))
      this.#recvBuffer.reclaim()
      return size
    }

    if (this.#error != null) throw this.#error
    await this.#cv.wait()
    if (this.#error != null) throw this.#error

    const size = Math.min(this.#recvBuffer.available, into.length)
    into.set(this.#recvBuffer.readSync(size))
    this.#recvBuffer.reclaim()
    return size
  }

  async write(bytes: Uint8Array): Promise<void> {
    if (this.#error) throw this.#error
    if (this.#sendBuffer.isEmpty()) {
      const written = this.socket.write(bytes)
      if (written === bytes.length) return
      bytes = bytes.subarray(written)
    }

    const deferred = new Deferred()
    this.#sendBuffer.pushBack(new SendBufferItem(bytes, deferred))
    return deferred.promise
  }

  close(): void {
    this.socket.end()
    this._handleClose()
  }

  get localAddress(): TcpEndpoint {
    const isIpv6 = this.socket.remoteAddress.includes(':')

    return {
      address: isIpv6 ? '::1' : '127.0.0.1',
      port: this.socket.localPort,
    }
  }

  get remoteAddress(): TcpEndpoint {
    if (this.#endpoint) return this.#endpoint

    return {
      address: this.socket.remoteAddress,
      get port(): never {
        throw new Error('Not available in Bun')
      },
    }
  }

  setKeepAlive(_val: boolean): void {
    throw new Error('Not available in Bun')
  }

  setNoDelay(_val: boolean): void {
    throw new Error('Not available in Bun')
  }

  getAlpnProtocol(): string | null {
    throw new Error('Not available in Bun')
  }
}
