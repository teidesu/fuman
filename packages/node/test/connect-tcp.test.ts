import EventEmitter from 'node:events'

import { ConnectionClosedError, type TcpEndpoint } from '@fuman/net'
import { describe, expect, it, vi } from 'vitest'

const ENDPOINT: TcpEndpoint = { address: '127.0.0.1', port: 1234 }

vi.doMock('net', () => ({
    Socket: class extends EventEmitter {
        constructor() {
            super()

            vi.spyOn(this, 'on' as any)
        }

        resume = vi.fn()
        setKeepAlive = vi.fn()
        setNoDelay = vi.fn()
        write = vi.fn().mockImplementation((data: Uint8Array, cb: () => void) => {
            cb()
        })

        destroy = vi.fn()
        connect = vi.fn().mockImplementation(() => {
            setTimeout(() => {
                this.emit('connect')
            })
        })

        localAddress = '127.0.0.1'
        localFamily = 'IPv4'
        localPort = 666
        remoteAddress = '127.0.0.1'
        remoteFamily = 'IPv4'
        remotePort = 1234
    },
}))

const { connectTcp } = await import('../src/index.js')

describe('connectTcp', () => {
    it('should initiate a tcp connection to the given endpoint', async () => {
        const conn = await connectTcp(ENDPOINT)
        const socket = vi.mocked(conn.socket)

        expect(conn.remoteAddress).toEqual({ address: '127.0.0.1', port: 1234 })
        expect(conn.localAddress).toEqual({ address: '127.0.0.1', port: 666 })

        expect(socket.resume).toHaveBeenCalledOnce()
        expect(socket.connect).toHaveBeenCalledWith(1234, '127.0.0.1')

        expect(socket.on).toHaveBeenCalledWith('data', expect.any(Function))
        expect(socket.on).toHaveBeenCalledWith('error', expect.any(Function))
        expect(socket.on).toHaveBeenCalledWith('close', expect.any(Function))
    })

    it('should hold a buffer from the wire', async () => {
        const conn = await connectTcp(ENDPOINT)
        const socket = vi.mocked(conn.socket)

        socket.emit('data', new Uint8Array([1, 2, 3]))
        socket.emit('data', new Uint8Array([4, 5, 6]))

        const buf = new Uint8Array(10)
        const nread = await conn.read(buf)

        expect(nread).toEqual(6)
        expect(buf).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6, 0, 0, 0, 0]))
    })

    it('should return from buffer before waiting for new data', async () => {
        const conn = await connectTcp(ENDPOINT)
        const socket = vi.mocked(conn.socket)

        socket.emit('data', new Uint8Array([1, 2, 3]))
        socket.emit('data', new Uint8Array([4, 5]))

        const buf = new Uint8Array(2)
        const nread = await conn.read(buf)
        const nread2 = await conn.read(buf)
        const nread3 = await conn.read(buf)
        const promise = conn.read(buf)

        socket.emit('data', new Uint8Array([6, 7]))

        expect(nread).toEqual(2)
        expect(nread2).toEqual(2)
        expect(nread3).toEqual(1)
        expect(await promise).toEqual(2)
        expect(buf).toEqual(new Uint8Array([6, 7]))
    })

    it('should throw error on next read call', async () => {
        const conn = await connectTcp(ENDPOINT)
        const socket = vi.mocked(conn.socket)

        socket.emit('error', new Error('lol'))

        await expect(conn.read(new Uint8Array(10))).rejects.toThrow('lol')
    })

    it('should throw ConnectionClosedError on next read call when closed', async () => {
        const conn = await connectTcp(ENDPOINT)
        const socket = vi.mocked(conn.socket)

        socket.emit('close')

        await expect(conn.read(new Uint8Array(10))).rejects.toThrow(ConnectionClosedError)
    })

    it('should exhaust buffer before throwing', async () => {
        const conn = await connectTcp(ENDPOINT)
        const socket = vi.mocked(conn.socket)

        socket.emit('data', new Uint8Array([1, 2, 3]))
        socket.emit('close')

        const buf = new Uint8Array(10)
        const nread = await conn.read(buf)

        expect(nread).toEqual(3)
        expect(buf).toEqual(new Uint8Array([1, 2, 3, 0, 0, 0, 0, 0, 0, 0]))
        await expect(conn.read(buf)).rejects.toThrow(ConnectionClosedError)
    })

    it('should throw if error happened while waiting for more data', async () => {
        const conn = await connectTcp(ENDPOINT)
        const socket = vi.mocked(conn.socket)

        const buf = new Uint8Array(10)
        const promise = conn.read(buf)

        socket.emit('close')

        await expect(promise).rejects.toThrow(ConnectionClosedError)
    })

    it('should call write when data is written', async () => {
        const conn = await connectTcp(ENDPOINT)
        const socket = vi.mocked(conn.socket)

        await conn.write(new Uint8Array([1, 2, 3]))

        expect(socket.write).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]), expect.any(Function))
    })

    it('should throw if write is called after close', async () => {
        const conn = await connectTcp(ENDPOINT)

        conn.close()

        await expect(conn.write(new Uint8Array([1, 2, 3]))).rejects.toThrow(ConnectionClosedError)
    })

    it('should propagate setKeepAlive', async () => {
        const conn = await connectTcp(ENDPOINT)
        const socket = vi.mocked(conn.socket)

        conn.setKeepAlive(true)

        expect(socket.setKeepAlive).toHaveBeenCalledWith(true)
    })

    it('should propagate setNoDelay', async () => {
        const conn = await connectTcp(ENDPOINT)
        const socket = vi.mocked(conn.socket)

        conn.setNoDelay(true)

        expect(socket.setNoDelay).toHaveBeenCalledWith(true)
    })

    it('should close the socket on close', async () => {
        const conn = await connectTcp(ENDPOINT)
        const socket = vi.mocked(conn.socket)

        conn.close()

        expect(socket.destroy).toHaveBeenCalledOnce()
    })

    it('should reject pending reads on close', async () => {
        const conn = await connectTcp(ENDPOINT)

        const promise = conn.read(new Uint8Array(10))

        conn.close()

        await expect(promise).rejects.toThrow(ConnectionClosedError)
    })
})
