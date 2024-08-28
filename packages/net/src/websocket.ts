import type { IClosable } from '@fuman/io'

import type { ConnectFunction, IConnection } from './types.js'
import { Bytes } from '@fuman/io'
import { ConditionVariable, Deque, utf8 } from '@fuman/utils'
import { ConnectionClosedError } from './errors.js'

export class WebSocketConnectionClosedError extends ConnectionClosedError {
    constructor(readonly code: number, readonly reason: string) {
        super(`code ${code} (${reason})`)
    }
}

function eventToError(event: Event): Error {
    if (event instanceof Error) {
        return event
    }

    return 'error' in event ? event.error as Error : new Error('unknown WebSocket error', { cause: event })
}

abstract class WebSocketConnectionBase implements IClosable {
    protected _error: Error | null = null
    protected _cv: ConditionVariable

    constructor(readonly socket: WebSocket) {
        this._cv = new ConditionVariable()

        socket.addEventListener('message', (event) => {
            this.onMessage(event)
            this._cv.notify()
        })
        socket.addEventListener('close', (event) => {
            this._error = new WebSocketConnectionClosedError(event.code, event.reason)
            this._cv.notify()
        })
        socket.addEventListener('error', (event) => {
            this._error = eventToError(event)
            this._cv.notify()
        })
    }

    get remoteAddress(): string | null {
        return this.socket.url
    }

    get localAddress(): never {
        throw new Error('.localAddress is not available for WebSockets')
    }

    close(): void {
        this.socket?.close()
        this._error = new ConnectionClosedError()
    }

    closeWithCode(code: number, reason?: string): void {
        this.socket.close(code, reason)
        this._error = new ConnectionClosedError()
    }

    abstract onMessage(event: MessageEvent): void
}

export class WebSocketConnection extends WebSocketConnectionBase implements IConnection<string, never> {
    #buffer: Bytes

    constructor(socket: WebSocket) {
        super(socket)
        this.#buffer = Bytes.alloc(0)
    }

    onMessage(event: MessageEvent): void {
        if (typeof event.data === 'string') {
            const buf = this.#buffer.writeSync(utf8.encodedLength(event.data))
            utf8.encoder.encodeInto(event.data, buf)
        } else {
            const u8 = new Uint8Array(event.data as ArrayBuffer)
            this.#buffer.writeSync(u8.length).set(u8)
        }

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

export class WebSocketConnectionFramed extends WebSocketConnectionBase {
    #buffer: Deque<string | Uint8Array> = new Deque()

    onMessage(event: MessageEvent): void {
        if (typeof event.data === 'string') {
            this.#buffer.pushBack(event.data)
        } else {
            this.#buffer.pushBack(new Uint8Array(event.data as ArrayBuffer))
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

export interface WebSocketConstructor {
    new(url: string | URL, protocols?: string | string[]): WebSocket
}

export interface WebSocketEndpoint {
    readonly url: string | URL
    readonly implementation?: WebSocketConstructor
    readonly protocols?: string | string[]
}

export const connectWs: ConnectFunction<WebSocketEndpoint, WebSocketConnection> = (endpoint) => {
    const {
        url,
        implementation: WebSocketImpl = WebSocket,
        protocols,
    } = endpoint

    return new Promise((resolve, reject) => {
        const socket = new WebSocketImpl(url, protocols)
        socket.binaryType = 'arraybuffer'

        const onError = (event: Event) => {
            socket.removeEventListener('error', onError)
            reject(eventToError(event))
        }
        socket.addEventListener('error', onError)
        socket.addEventListener('open', () => {
            socket.removeEventListener('error', onError)
            resolve(new WebSocketConnection(socket))
        })
    })
}

export async function connectWsFramed(endpoint: WebSocketEndpoint): Promise<WebSocketConnectionFramed> {
    const {
        url,
        implementation: WebSocketImpl = WebSocket,
        protocols,
    } = endpoint

    return new Promise((resolve, reject) => {
        const socket = new WebSocketImpl(url, protocols)
        socket.binaryType = 'arraybuffer'

        const onError = (event: Event) => {
            socket.removeEventListener('error', onError)
            reject(eventToError(event))
        }
        socket.addEventListener('error', onError)
        socket.addEventListener('open', () => {
            socket.removeEventListener('error', onError)
            resolve(new WebSocketConnectionFramed(socket))
        })
    })
}
