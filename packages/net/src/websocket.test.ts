import type { WebSocketConstructor } from './websocket.js'
import { describe, expect, it, vi } from 'vitest'

import { ConnectionClosedError } from './errors.js'
import { connectWs, connectWsFramed, WebSocketConnectionClosedError } from './websocket.js'

class FakeWebSocket {
  url: string
  protocols?: string | string[]
  constructor(url: string | URL, protocols?: string | string[]) {
    this.url = url.toString()
    this.protocols = protocols
  }

  closeListener?: (event: Event) => void
  errorListener?: (err: unknown) => void
  messageListener?: (msg: MessageEvent) => void
  addEventListener = vi.fn().mockImplementation((event: string, cb: () => void) => {
    if (event === 'open') {
      cb()
    }

    if (event === 'close') {
      this.closeListener = cb
    }
    if (event === 'error') {
      this.errorListener = cb
    }
    if (event === 'message') {
      this.messageListener = cb
    }
  })

  removeEventListener = vi.fn()
  send = vi.fn()

  close = vi.fn().mockImplementation(() => this.closeListener?.(new Event('close')))

  emitError(err: Error) {
    this.errorListener?.({
      error: err,
    })
  }

  emitMessage(msg: string | ArrayBuffer | Blob | ArrayBufferView) {
    this.messageListener?.({
      data: msg,
    } as MessageEvent)
  }
}

describe('connectWs', () => {
  const ENDPOINT = {
    url: 'ws://localhost',
    implementation: FakeWebSocket as any as WebSocketConstructor,
  }

  it('should connect to a websocket', async () => {
    const conn = await connectWs(ENDPOINT)

    expect(conn.remoteAddress).toBe(ENDPOINT.url)
    expect(() => conn.localAddress).toThrow(Error)

    expect(conn.socket).toBeInstanceOf(FakeWebSocket)
    expect(conn.socket.url).toBe(ENDPOINT.url)
    expect(conn.socket.addEventListener).toHaveBeenCalledWith('message', expect.any(Function))
    expect(conn.socket.addEventListener).toHaveBeenCalledWith('close', expect.any(Function))
    expect(conn.socket.addEventListener).toHaveBeenCalledWith('error', expect.any(Function))
  })

  it('should pass protocols to the socket', async () => {
    const conn = await connectWs({ ...ENDPOINT, protocols: ['foo', 'bar'] })

    expect(conn.socket).toBeInstanceOf(FakeWebSocket)
    expect(conn.socket.url).toBe(ENDPOINT.url)
    expect((conn.socket as unknown as FakeWebSocket).protocols).toEqual(['foo', 'bar'])
  })

  it('should throw if connect fails', async () => {
    class FakeWebSocket2 extends FakeWebSocket {
      addEventListener = vi.fn().mockImplementation((event: string, cb: () => void) => {
        if (event === 'open') {
          this.errorListener?.(new Error('lol'))
        }

        if (event === 'close') {
          this.closeListener = cb
        }
        if (event === 'error') {
          this.errorListener = cb
        }
        if (event === 'message') {
          this.messageListener = cb
        }
      })
    }

    await expect(connectWs({
      url: ENDPOINT.url,
      implementation: FakeWebSocket2 as any,
    })).rejects.toThrow('lol')
  })

  it('should default to global WebSocket', async () => {
    vi.stubGlobal('WebSocket', FakeWebSocket)

    const conn = await connectWs({ url: ENDPOINT.url })

    expect(conn.socket).toBeInstanceOf(FakeWebSocket)

    vi.unstubAllGlobals()
  })

  it('should hold a buffer from the wire', async () => {
    const conn = await connectWs(ENDPOINT)
    const socket = conn.socket as any as FakeWebSocket

    socket.emitMessage('\x01\x02\x03')
    socket.emitMessage(new Uint8Array([4, 5, 6]))

    const buf = new Uint8Array(10)
    const nread = await conn.read(buf)

    expect(nread).toEqual(6)
    expect(buf).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6, 0, 0, 0, 0]))
  })

  it('should return from buffer before waiting for new data', async () => {
    const conn = await connectWs(ENDPOINT)
    const socket = conn.socket as any as FakeWebSocket

    socket.emitMessage(new Uint8Array([1, 2, 3]))
    socket.emitMessage(new Uint8Array([4, 5]))

    const buf = new Uint8Array(2)
    const nread = await conn.read(buf)
    const nread2 = await conn.read(buf)
    const nread3 = await conn.read(buf)
    const promise = conn.read(buf)

    socket.emitMessage(new Uint8Array([6, 7]))

    expect(nread).toEqual(2)
    expect(nread2).toEqual(2)
    expect(nread3).toEqual(1)
    expect(await promise).toEqual(2)
    expect(buf).toEqual(new Uint8Array([6, 7]))
  })

  it('should throw error on next read call', async () => {
    const conn = await connectWs(ENDPOINT)
    const socket = conn.socket as any as FakeWebSocket

    socket.emitError(new Error('lol'))

    await expect(conn.read(new Uint8Array(10))).rejects.toThrow('lol')
  })

  it('should throw WebSocketConnectionClosedError on next read call when closed', async () => {
    const conn = await connectWs(ENDPOINT)
    const socket = conn.socket as any as FakeWebSocket

    socket.close()

    await expect(conn.read(new Uint8Array(10))).rejects.toThrow(WebSocketConnectionClosedError)
  })

  it('should exhaust buffer before throwing', async () => {
    const conn = await connectWs(ENDPOINT)
    const socket = conn.socket as any as FakeWebSocket

    socket.emitMessage(new Uint8Array([1, 2, 3]))
    socket.close()

    const buf = new Uint8Array(10)
    const nread = await conn.read(buf)

    expect(nread).toEqual(3)
    expect(buf).toEqual(new Uint8Array([1, 2, 3, 0, 0, 0, 0, 0, 0, 0]))
    await expect(conn.read(buf)).rejects.toThrow(ConnectionClosedError)
  })

  it('should throw if error happened while waiting for more data', async () => {
    const conn = await connectWs(ENDPOINT)
    const socket = conn.socket as any as FakeWebSocket

    const buf = new Uint8Array(10)
    const promise = conn.read(buf)

    socket.close()

    await expect(promise).rejects.toThrow(ConnectionClosedError)
  })

  it('should call send when data is written', async () => {
    const conn = await connectWs(ENDPOINT)
    const socket = conn.socket as any as FakeWebSocket

    await conn.write(new Uint8Array([1, 2, 3]))

    expect(socket.send).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]))
  })

  it('should throw if write is called after close', async () => {
    const conn = await connectWs(ENDPOINT)

    conn.close()

    await expect(conn.write(new Uint8Array([1, 2, 3]))).rejects.toThrow(ConnectionClosedError)
  })

  it('should close the socket on close', async () => {
    const conn = await connectWs(ENDPOINT)
    const socket = vi.mocked(conn.socket)

    conn.close()

    expect(socket.close).toHaveBeenCalledOnce()
  })

  it('should close the socket on close with code', async () => {
    const conn = await connectWs(ENDPOINT)
    const socket = vi.mocked(conn.socket)

    conn.closeWithCode(10, 'reason')

    expect(socket.close).toHaveBeenCalledWith(10, 'reason')
  })

  it('should reject pending reads on close', async () => {
    const conn = await connectWs(ENDPOINT)

    const promise = conn.read(new Uint8Array(10))

    conn.close()

    await expect(promise).rejects.toThrow(ConnectionClosedError)
  })

  it('should reject pending reads on close with code', async () => {
    const conn = await connectWs(ENDPOINT)

    const promise = conn.read(new Uint8Array(10))

    conn.closeWithCode(10, 'reason')

    await expect(promise).rejects.toThrow(ConnectionClosedError)
  })
})

describe('connectWsFramed', () => {
  const ENDPOINT = {
    url: 'ws://localhost',
    implementation: FakeWebSocket as any as WebSocketConstructor,
  }

  it('should connect to a websocket', async () => {
    const conn = await connectWsFramed(ENDPOINT)

    expect(conn.remoteAddress).toBe(ENDPOINT.url)
    expect(() => conn.localAddress).toThrow(Error)

    expect(conn.socket).toBeInstanceOf(FakeWebSocket)
    expect(conn.socket.url).toBe(ENDPOINT.url)
    expect(conn.socket.addEventListener).toHaveBeenCalledWith('message', expect.any(Function))
    expect(conn.socket.addEventListener).toHaveBeenCalledWith('close', expect.any(Function))
    expect(conn.socket.addEventListener).toHaveBeenCalledWith('error', expect.any(Function))
  })

  it('should throw if connect fails', async () => {
    class FakeWebSocket2 extends FakeWebSocket {
      addEventListener = vi.fn().mockImplementation((event: string, cb: () => void) => {
        if (event === 'open') {
          this.errorListener?.(new Error('lol'))
        }

        if (event === 'close') {
          this.closeListener = cb
        }
        if (event === 'error') {
          this.errorListener = cb
        }
        if (event === 'message') {
          this.messageListener = cb
        }
      })
    }

    await expect(connectWsFramed({
      url: ENDPOINT.url,
      implementation: FakeWebSocket2 as any,
    })).rejects.toThrow('lol')
  })

  it('should default to global WebSocket', async () => {
    vi.stubGlobal('WebSocket', FakeWebSocket)

    const conn = await connectWsFramed({ url: ENDPOINT.url })

    expect(conn.socket).toBeInstanceOf(FakeWebSocket)

    vi.unstubAllGlobals()
  })

  it('should pass protocols to the socket', async () => {
    const conn = await connectWsFramed({ ...ENDPOINT, protocols: ['foo', 'bar'] })

    expect(conn.socket).toBeInstanceOf(FakeWebSocket)
    expect(conn.socket.url).toBe(ENDPOINT.url)
    expect((conn.socket as unknown as FakeWebSocket).protocols).toEqual(['foo', 'bar'])
  })

  it('should hold a buffer of frames from the wire', async () => {
    const conn = await connectWsFramed(ENDPOINT)
    const socket = conn.socket as any as FakeWebSocket

    socket.emitMessage('\x01\x02\x03')
    socket.emitMessage(new Uint8Array([4, 5, 6]))

    expect(await conn.readFrame()).toEqual('\x01\x02\x03')
    expect(await conn.readFrame()).toEqual(new Uint8Array([4, 5, 6]))
  })

  it('should return from buffer before waiting for new data', async () => {
    const conn = await connectWsFramed(ENDPOINT)
    const socket = conn.socket as any as FakeWebSocket

    socket.emitMessage(new Uint8Array([1, 2, 3]))
    socket.emitMessage(new Uint8Array([4, 5]))

    const buf1 = await conn.readFrame()
    const buf2 = await conn.readFrame()
    const promise = conn.readFrame()

    socket.emitMessage(new Uint8Array([6, 7]))

    expect(buf1).toEqual(new Uint8Array([1, 2, 3]))
    expect(buf2).toEqual(new Uint8Array([4, 5]))
    expect(await promise).toEqual(new Uint8Array([6, 7]))
  })

  it('should throw error on next readFrame call', async () => {
    const conn = await connectWsFramed(ENDPOINT)
    const socket = conn.socket as any as FakeWebSocket

    socket.emitError(new Error('lol'))

    await expect(conn.readFrame()).rejects.toThrow('lol')
  })

  it('should throw WebSocketConnectionClosedError on next read call when closed', async () => {
    const conn = await connectWsFramed(ENDPOINT)
    const socket = conn.socket as any as FakeWebSocket

    socket.close()

    await expect(conn.readFrame()).rejects.toThrow(WebSocketConnectionClosedError)
  })

  it('should exhaust buffer before throwing', async () => {
    const conn = await connectWsFramed(ENDPOINT)
    const socket = conn.socket as any as FakeWebSocket

    socket.emitMessage(new Uint8Array([1, 2, 3]))
    socket.close()

    expect(await conn.readFrame()).toEqual(new Uint8Array([1, 2, 3]))
    await expect(conn.readFrame()).rejects.toThrow(ConnectionClosedError)
  })

  it('should throw if error happened while waiting for more data', async () => {
    const conn = await connectWsFramed(ENDPOINT)
    const socket = conn.socket as any as FakeWebSocket

    const promise = conn.readFrame()

    socket.close()

    await expect(promise).rejects.toThrow(ConnectionClosedError)
  })

  it('should call send when data is written', async () => {
    const conn = await connectWsFramed(ENDPOINT)
    const socket = conn.socket as any as FakeWebSocket

    await conn.writeFrame(new Uint8Array([1, 2, 3]))
    await conn.writeFrame('hello')

    expect(socket.send).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]))
    expect(socket.send).toHaveBeenCalledWith('hello')
  })

  it('should throw if write is called after close', async () => {
    const conn = await connectWsFramed(ENDPOINT)

    conn.close()

    await expect(conn.writeFrame(new Uint8Array([1, 2, 3]))).rejects.toThrow(ConnectionClosedError)
  })

  it('should close the socket on close', async () => {
    const conn = await connectWsFramed(ENDPOINT)
    const socket = vi.mocked(conn.socket)

    conn.close()

    expect(socket.close).toHaveBeenCalledOnce()
  })

  it('should close the socket on close with code', async () => {
    const conn = await connectWsFramed(ENDPOINT)
    const socket = vi.mocked(conn.socket)

    conn.closeWithCode(10, 'reason')

    expect(socket.close).toHaveBeenCalledWith(10, 'reason')
  })

  it('should reject pending reads on close', async () => {
    const conn = await connectWsFramed(ENDPOINT)

    const promise = conn.readFrame()

    conn.close()

    await expect(promise).rejects.toThrow(ConnectionClosedError)
  })

  it('should reject pending reads on close with code', async () => {
    const conn = await connectWsFramed(ENDPOINT)

    const promise = conn.readFrame()

    conn.closeWithCode(10, 'reason')

    await expect(promise).rejects.toThrow(ConnectionClosedError)
  })
})
