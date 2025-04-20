import type { TcpEndpoint } from '@fuman/net'
import type { TCPSocketConnectOptions } from 'bun'
import { ConnectionClosedError } from '@fuman/net'
import { afterAll, describe, expect, it, vi } from 'vitest'

import { connectTcp } from '../src/functions.js'

const ENDPOINT: TcpEndpoint = { address: '127.0.0.1', port: 1234 }

describe('connectTcp', () => {
  vi.stubGlobal('Bun', {
    connect: vi.fn().mockImplementation((opts: TCPSocketConnectOptions) => {
      return {
        _handlers: opts.socket,
        write: vi.fn().mockImplementation(data => data.length),
        end: vi.fn(),
        remoteAddress: opts.hostname,
        localPort: 666,
      }
    }),
  })

  afterAll(() => { vi.unstubAllGlobals() })

  it('should initiate a tcp connection to the given endpoint', async () => {
    const conn = await connectTcp(ENDPOINT)

    expect(Bun.connect).toHaveBeenCalledWith({
      hostname: ENDPOINT.address,
      port: ENDPOINT.port,
      socket: expect.any(Object),
      tls: false,
    })

    expect(conn.remoteAddress).toEqual({ address: '127.0.0.1', port: 1234 })
    expect(conn.localAddress).toEqual({ address: '127.0.0.1', port: 666 })
  })

  it('should hold a buffer from the wire', async () => {
    const conn = await connectTcp(ENDPOINT)
    const handlers = (conn.socket as any)._handlers

    handlers.data(null, new Uint8Array([1, 2, 3]))
    handlers.data(null, new Uint8Array([4, 5, 6]))

    const buf = new Uint8Array(10)
    const nread = await conn.read(buf)

    expect(nread).toEqual(6)
    expect(buf).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6, 0, 0, 0, 0]))
  })

  it('should return from buffer before waiting for new data', async () => {
    const conn = await connectTcp(ENDPOINT)
    const handlers = (conn.socket as any)._handlers

    handlers.data(null, new Uint8Array([1, 2, 3]))
    handlers.data(null, new Uint8Array([4, 5]))

    const buf = new Uint8Array(2)
    const nread = await conn.read(buf)
    const nread2 = await conn.read(buf)
    const nread3 = await conn.read(buf)
    const promise = conn.read(buf)

    handlers.data(null, new Uint8Array([6, 7]))

    expect(nread).toEqual(2)
    expect(nread2).toEqual(2)
    expect(nread3).toEqual(1)
    expect(await promise).toEqual(2)
    expect(buf).toEqual(new Uint8Array([6, 7]))
  })

  it('should throw error on next read call', async () => {
    const conn = await connectTcp(ENDPOINT)
    const handlers = (conn.socket as any)._handlers

    handlers.error(null, new Error('lol'))

    await expect(conn.read(new Uint8Array(10))).rejects.toThrow('lol')
  })

  it('should throw ConnectionClosedError on next read call when closed', async () => {
    const conn = await connectTcp(ENDPOINT)
    const handlers = (conn.socket as any)._handlers

    handlers.close()

    await expect(conn.read(new Uint8Array(10))).rejects.toThrow(ConnectionClosedError)
  })

  it('should exhaust buffer before throwing', async () => {
    const conn = await connectTcp(ENDPOINT)
    const handlers = (conn.socket as any)._handlers

    handlers.data(null, new Uint8Array([1, 2, 3]))
    handlers.close()

    const buf = new Uint8Array(10)
    const nread = await conn.read(buf)

    expect(nread).toEqual(3)
    expect(buf).toEqual(new Uint8Array([1, 2, 3, 0, 0, 0, 0, 0, 0, 0]))
    await expect(conn.read(buf)).rejects.toThrow(ConnectionClosedError)
  })

  it('should throw if error happened while waiting for more data', async () => {
    const conn = await connectTcp(ENDPOINT)
    const handlers = (conn.socket as any)._handlers

    const buf = new Uint8Array(10)
    const promise = conn.read(buf)

    handlers.close()

    await expect(promise).rejects.toThrow(ConnectionClosedError)
  })

  it('should call write when data is written', async () => {
    const conn = await connectTcp(ENDPOINT)
    const socket = vi.mocked(conn.socket)

    await conn.write(new Uint8Array([1, 2, 3]))

    expect(socket.write).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]))
  })

  it('should call write after drain when data is buffered', async () => {
    const log: string[] = []
    const conn = await connectTcp(ENDPOINT)
    const socket = vi.mocked(conn.socket)
    const handlers = (conn.socket as any)._handlers

    socket.write.mockImplementation(() => 1)

    log.push('before write')
    const promise = conn.write(new Uint8Array([1, 2, 3]))
      .then(() => log.push('write resolved'))
    log.push('write returned')
    handlers.drain()
    log.push('drain 1')
    handlers.drain()
    log.push('drain 2')
    await promise

    expect(socket.write).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]))
    expect(socket.write).toHaveBeenCalledWith(new Uint8Array([2, 3]))
    expect(socket.write).toHaveBeenCalledWith(new Uint8Array([3]))
    expect(log).toEqual([
      'before write',
      'write returned',
      'drain 1',
      'drain 2',
      'write resolved',
    ])
  })

  it('should throw if write is called after close', async () => {
    const conn = await connectTcp(ENDPOINT)

    conn.close()

    await expect(conn.write(new Uint8Array([1, 2, 3]))).rejects.toThrow(ConnectionClosedError)
  })

  it('should close the socket on close', async () => {
    const conn = await connectTcp(ENDPOINT)
    const socket = vi.mocked(conn.socket)

    conn.close()

    expect(socket.end).toHaveBeenCalledOnce()
  })

  it('should reject pending reads on close', async () => {
    const conn = await connectTcp(ENDPOINT)

    const promise = conn.read(new Uint8Array(10))

    conn.close()

    await expect(promise).rejects.toThrow(ConnectionClosedError)
  })

  it('should reject pending writes on close', async () => {
    const conn = await connectTcp(ENDPOINT)
    const socket = vi.mocked(conn.socket)

    socket.write.mockImplementation(() => 1)
    const promise = conn.write(new Uint8Array(10))

    conn.close()

    await expect(promise).rejects.toThrow(ConnectionClosedError)
  })

  it('should throw on unsupported methods', async () => {
    const conn = await connectTcp(ENDPOINT)

    expect(() => conn.setKeepAlive(false)).toThrow('Not available in Bun')
    expect(() => conn.setNoDelay(false)).toThrow('Not available in Bun')
    expect(() => conn.getAlpnProtocol()).toThrow('Not available in Bun')
  })
})
