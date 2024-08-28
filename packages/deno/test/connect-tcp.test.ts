import type { TcpConnection } from '../src'
import { ConnectionClosedError, type TcpEndpoint } from '@fuman/net'

import { afterAll, describe, expect, it, vi } from 'vitest'
import { connectTcp } from '../src/functions.js'

const ENDPOINT: TcpEndpoint = { address: '127.0.0.1', port: 1234 }

describe('connectTcp', () => {
    vi.stubGlobal('Deno', {
        connect: vi.fn().mockImplementation((opts: Deno.ConnectOptions) => {
            return {
                write: vi.fn().mockImplementation(data => data.length),
                read: vi.fn().mockImplementation(() => null),
                end: vi.fn(),
                setKeepAlive: vi.fn(),
                setNoDelay: vi.fn(),
                localAddr: {
                    hostname: '127.0.0.1',
                    port: 666,
                },
                remoteAddr: {
                    hostname: opts.hostname,
                    port: opts.port,
                },
            }
        }),
        errors: {
            BadResource: class BadResource extends Error {},
            Interrupted: class BadResource extends Error {},
        },
    })

    const mockNextRead = (connection: TcpConnection, handler: () => Uint8Array) => {
        vi.mocked(connection.conn).read.mockImplementationOnce(async (into: Uint8Array) => {
            into.set(handler())
            return 6
        })
    }

    afterAll(() => { vi.unstubAllGlobals() })

    it('should initiate a tcp connection to the given endpoint', async () => {
        const conn = await connectTcp(ENDPOINT)

        expect(Deno.connect).toHaveBeenCalledWith({
            hostname: ENDPOINT.address,
            port: ENDPOINT.port,
        })

        expect(conn.remoteAddress).toEqual({ address: '127.0.0.1', port: 1234 })
        expect(conn.localAddress).toEqual({ address: '127.0.0.1', port: 666 })
    })

    it('should call read() from the underlying socket', async () => {
        const conn = await connectTcp(ENDPOINT)
        const socket = vi.mocked(conn.conn)

        mockNextRead(conn, () => new Uint8Array([1, 2, 3, 4, 5, 6]))

        const buf = new Uint8Array(10)
        const nread = await conn.read(buf)

        expect(nread).toEqual(6)
        expect(buf).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6, 0, 0, 0, 0]))
        expect(socket.read).toHaveBeenCalledWith(buf)
    })

    it('read() should throw ConnectionClosedError on BadResource', async () => {
        const conn = await connectTcp(ENDPOINT)

        mockNextRead(conn, () => { throw new Deno.errors.BadResource() })

        await expect(conn.read(new Uint8Array(10))).rejects.toThrow(ConnectionClosedError)
    })

    it('read() should throw ConnectionClosedError on Interrupted', async () => {
        const conn = await connectTcp(ENDPOINT)

        mockNextRead(conn, () => { throw new Deno.errors.Interrupted() })

        await expect(conn.read(new Uint8Array(10))).rejects.toThrow(ConnectionClosedError)
    })

    it('read() should throw unknown errors', async () => {
        const conn = await connectTcp(ENDPOINT)

        mockNextRead(conn, () => { throw new Error('lol') })

        await expect(conn.read(new Uint8Array(10))).rejects.toThrow('lol')
    })

    it('should call write when data is written', async () => {
        const conn = await connectTcp(ENDPOINT)
        const socket = vi.mocked(conn.conn)

        await conn.write(new Uint8Array([1, 2, 3]))

        expect(socket.write).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]))
    })

    it('should call write continuously when data doesnt fit', async () => {
        const conn = await connectTcp(ENDPOINT)
        const socket = vi.mocked(conn.conn)

        socket.write.mockImplementation(async () => 1)

        await conn.write(new Uint8Array([1, 2, 3]))

        expect(socket.write).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]))
        expect(socket.write).toHaveBeenCalledWith(new Uint8Array([2, 3]))
        expect(socket.write).toHaveBeenCalledWith(new Uint8Array([3]))
    })

    // it('should call write after drain when data is buffered', async () => {
    //     const conn = await connectTcp(ENDPOINT)
    //     const socket = vi.mocked(conn.socket)
    //     const handlers = (conn.socket as any)._handlers

    //     socket.write.mockImplementation(() => 1)

    //     await conn.write(new Uint8Array([1, 2, 3]))
    //     handlers.drain()
    //     handlers.drain()

    //     expect(socket.write).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]))
    //     expect(socket.write).toHaveBeenCalledWith(new Uint8Array([2, 3]))
    //     expect(socket.write).toHaveBeenCalledWith(new Uint8Array([3]))
    // })

    // it('should throw if write is called after close', async () => {
    //     const conn = await connectTcp(ENDPOINT)

    //     conn.close()

    //     await expect(conn.write(new Uint8Array([1, 2, 3]))).rejects.toThrow(ConnectionClosedError)
    // })

    // it('should close the socket on close', async () => {
    //     const conn = await connectTcp(ENDPOINT)
    //     const socket = vi.mocked(conn.socket)

    //     conn.close()

    //     expect(socket.end).toHaveBeenCalledOnce()
    // })

    // it('should reject pending reads on close', async () => {
    //     const conn = await connectTcp(ENDPOINT)

    //     const promise = conn.read(new Uint8Array(10))

    //     conn.close()

    //     await expect(promise).rejects.toThrow(ConnectionClosedError)
    // })

    it('should propagate setKeepAlive', async () => {
        const conn = await connectTcp(ENDPOINT)
        const socket = vi.mocked(conn.conn)

        conn.setKeepAlive(true)

        expect(socket.setKeepAlive).toHaveBeenCalledWith(true)
    })

    it('should propagate setNoDelay', async () => {
        const conn = await connectTcp(ENDPOINT)
        const socket = vi.mocked(conn.conn)

        conn.setNoDelay(true)

        expect(socket.setNoDelay).toHaveBeenCalledWith(true)
    })
})
