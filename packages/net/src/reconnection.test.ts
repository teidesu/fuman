import { Bytes } from '@fuman/io'
import { ConditionVariable, Deferred, sleep } from '@fuman/utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FakeConnection } from './fake.js'
import { defaultReconnectionStrategy, PersistentConnection } from './reconnection.js'

class FakeConnection2 extends FakeConnection {}

describe('defaultReconnectionStrategy', () => {
    it('first - immediate reconnection', () => {
        const wait = defaultReconnectionStrategy({
            previousWait: null,
            lastError: null,
            consequentFails: 0,
        })

        expect(wait).toBe(0)
    })

    it('second - linear increase up to 5s', () => {
        const wait = defaultReconnectionStrategy({
            previousWait: 0,
            lastError: null,
            consequentFails: 1,
        })

        expect(wait).toBe(1000)
    })

    it('third - linear increase up to 5s', () => {
        const wait = defaultReconnectionStrategy({
            previousWait: 1000,
            lastError: null,
            consequentFails: 2,
        })

        expect(wait).toBe(2000)
    })

    it('fourth - linear increase up to 5s', () => {
        const wait = defaultReconnectionStrategy({
            previousWait: 2000,
            lastError: null,
            consequentFails: 3,
        })

        expect(wait).toBe(3000)
    })

    it('fifth - linear increase up to 5s', () => {
        const wait = defaultReconnectionStrategy({
            previousWait: 3000,
            lastError: null,
            consequentFails: 4,
        })
        expect(wait).toBe(4000)
    })

    it('sixth - linear increase up to 5s', () => {
        const wait = defaultReconnectionStrategy({
            previousWait: 4000,
            lastError: null,
            consequentFails: 5,
        })
        expect(wait).toBe(5000)
    })

    it('seventh - linear increase up to 5s (max)', () => {
        const wait = defaultReconnectionStrategy({
            previousWait: 5000,
            lastError: null,
            consequentFails: 6,
        })
        expect(wait).toBe(5000)
    })
})

describe('PersistentConnection', () => {
    beforeEach(() => void vi.useFakeTimers())
    afterEach(() => void vi.useRealTimers())

    const echoClient = async (conn: FakeConnection) => {
        const buf = Bytes.alloc()
        while (true) {
            const read = await conn.read(buf.writeSync(1024))
            if (read === 0) break
            await conn.write(buf.readSync(read))
        }
    }

    it('should open a connection', async () => {
        const log: string[] = []

        const opened = new ConditionVariable()
        const reconn = new PersistentConnection({
            connect: async (addr: string) => {
                log.push(`connect ${addr}`)
                return new FakeConnection(addr)
            },
            onOpen: async (conn) => {
                log.push('onOpen')
                opened.notify()
                await echoClient(conn)
            },
            onClose: () => { log.push('onClose') },
            onWait: (time) => { log.push(`onWait ${time}`) },
            onError: (err) => { log.push(`onError ${err.message}`); return 'close' },
        })

        reconn.connect('127.0.0.1:1234')
        await opened.wait()

        expect(reconn.connection).toBeInstanceOf(FakeConnection)
        expect(reconn.connection?.address).toBe('127.0.0.1:1234')

        await reconn.close()

        expect(log).toEqual([
            'connect 127.0.0.1:1234',
            'onOpen',
            'onClose',
        ])
    })

    it('should open a new connection if the old one is closed', async () => {
        const log: string[] = []
        let opened = new Deferred<void>()
        const wait = new Deferred<number>()

        const reconn = new PersistentConnection({
            connect: async (addr: string) => {
                log.push(`connect start ${addr}`)
                await sleep(10)
                log.push(`connect end ${addr}`)
                return new FakeConnection(addr)
            },
            onOpen: async (conn) => {
                log.push('onOpen')
                opened.resolve()
                await echoClient(conn)
            },
            onWait: (time) => {
                log.push(`onWait ${time}`)
                wait.resolve(time)
            },
            onClose: () => { log.push('onClose') },
        })

        expect(reconn.isConnected).toBe(false)
        expect(reconn.isConnecting).toBe(false)

        reconn.connect('127.0.0.1:1234')
        expect(reconn.isConnecting).toBe(true)
        expect(reconn.isConnected).toBe(false)
        expect(reconn.isWaiting).toBe(false)

        await vi.advanceTimersByTimeAsync(10)
        expect(reconn.isConnecting).toBe(false)
        expect(reconn.isConnected).toBe(true)
        expect(reconn.isWaiting).toBe(false)

        await opened.promise
        opened = new Deferred()

        const oldConn = reconn.connection
        expect(oldConn).toBeInstanceOf(FakeConnection)
        expect(oldConn?.address).toBe('127.0.0.1:1234')
        expect(reconn.isConnecting).toBe(false)
        expect(reconn.isConnected).toBe(true)
        expect(reconn.isWaiting).toBe(false)

        // eslint-disable-next-line ts/no-non-null-assertion
        oldConn!.close()
        expect(await wait.promise).toBe(0)
        expect(reconn.isConnecting).toBe(true)
        expect(reconn.isConnected).toBe(false)
        expect(reconn.isWaiting).toBe(false)

        await vi.advanceTimersByTimeAsync(10)
        await opened.promise

        expect(reconn.connection).toBeInstanceOf(FakeConnection)
        expect(reconn.connection?.address).toBe('127.0.0.1:1234')
        expect(reconn.connection).not.toBe(oldConn)
        expect(reconn.isConnecting).toBe(false)
        expect(reconn.isConnected).toBe(true)
        expect(reconn.isWaiting).toBe(false)

        await reconn.close()

        expect(log).toEqual([
            'connect start 127.0.0.1:1234',
            'connect end 127.0.0.1:1234',
            'onOpen',
            'onClose',
            'onWait 0',
            'connect start 127.0.0.1:1234',
            'connect end 127.0.0.1:1234',
            'onOpen',
            'onClose',
        ])
    })

    it('should throw if connection is already open', async () => {
        const reconn = new PersistentConnection({
            connect: async () => new FakeConnection('127.0.0.1:1234'),
            onOpen: echoClient,
        })

        reconn.connect('127.0.0.1:1234')

        expect(() => reconn.connect('127.0.0.2:1234')).toThrow(Error)
    })

    it('should cleanly change transport', async () => {
        const log: string[] = []

        let opened = new Deferred<void>()
        const connect1 = async (addr: string) => {
            log.push(`connect1 ${addr}`)
            return new FakeConnection(addr)
        }
        const connect2 = async (addr: string) => {
            log.push(`connect2 ${addr}`)
            return new FakeConnection2(addr)
        }

        const reconn = new PersistentConnection({
            connect: connect1,
            onOpen: async (conn) => {
                log.push(`onOpen FakeConnection${conn instanceof FakeConnection2 ? '2' : '1'}`)
                opened.resolve()
                await echoClient(conn)
            },
            onClose: () => { log.push('onClose') },
        })

        reconn.connect('127.0.0.1:1234')
        await opened.promise

        opened = new Deferred<void>()

        await reconn.changeTransport(connect2)
        await opened.promise

        await reconn.close()

        expect(log).toEqual([
            'connect1 127.0.0.1:1234',
            'onOpen FakeConnection1',
            'onClose',
            'connect2 127.0.0.1:1234',
            'onOpen FakeConnection2',
            'onClose',
        ])
    })

    it('should forcefully reconnect while waiting', async () => {
        const log: string[] = []

        let opened = new Deferred<void>()
        const wait = new Deferred<number>()
        const reconn = new PersistentConnection({
            connect: async (addr: string) => {
                log.push(`connect ${addr}`)
                return new FakeConnection(addr)
            },
            strategy: () => 1000,
            onOpen: async (conn) => {
                log.push('onOpen')
                opened.resolve()
                await echoClient(conn)
            },
            onClose: () => { log.push('onClose') },
            onWait: (time) => {
                wait.resolve(time)
                log.push(`onWait ${time}`)
            },
        })

        reconn.connect('127.0.0.1:1234')
        await opened.promise

        reconn.connection?.close()
        expect(await wait.promise).toBe(1000)
        expect(reconn.isWaiting).toBe(true)

        opened = new Deferred<void>()
        reconn.reconnect(false)
        await opened.promise

        await reconn.close()

        expect(log).toEqual([
            'connect 127.0.0.1:1234',
            'onOpen',
            'onClose',
            'onWait 1000',
            'connect 127.0.0.1:1234',
            'onOpen',
            'onClose',
        ])
    })

    it('should forcefully reconnect while connected', async () => {
        const log: string[] = []

        let opened = new Deferred<void>()
        const wait = new Deferred<number>()
        const reconn = new PersistentConnection({
            connect: async (addr: string) => {
                log.push(`connect ${addr}`)
                return new FakeConnection(addr)
            },
            onOpen: async (conn) => {
                log.push('onOpen')
                opened.resolve()
                await echoClient(conn)
            },
            onClose: () => { log.push('onClose') },
            onWait: (time) => {
                wait.resolve(time)
                log.push(`onWait ${time}`)
            },
        })

        reconn.connect('127.0.0.1:1234')
        await opened.promise

        opened = new Deferred<void>()
        reconn.reconnect(true)
        await opened.promise

        await reconn.close()

        expect(log).toEqual([
            'connect 127.0.0.1:1234',
            'onOpen',
            'onClose',
            'onWait 0',
            'connect 127.0.0.1:1234',
            'onOpen',
            'onClose',
        ])
    })

    it('should not forcefully reconnect while connected if false is passed', async () => {
        const log: string[] = []

        let opened = new Deferred<void>()
        const wait = new Deferred<number>()
        const reconn = new PersistentConnection({
            connect: async (addr: string) => {
                log.push(`connect ${addr}`)
                return new FakeConnection(addr)
            },
            onOpen: async (conn) => {
                log.push('onOpen')
                opened.resolve()
                await echoClient(conn)
            },
            onClose: () => { log.push('onClose') },
            onWait: (time) => {
                wait.resolve(time)
                log.push(`onWait ${time}`)
            },
        })

        reconn.connect('127.0.0.1:1234')
        await opened.promise

        opened = new Deferred<void>()
        reconn.reconnect(false)

        await reconn.close()

        expect(log).toEqual([
            'connect 127.0.0.1:1234',
            'onOpen',
            'onClose',
        ])
    })

    it('should stop when .close() is called while waiting', async () => {
        const log: string[] = []

        const opened = new Deferred<void>()
        const wait = new Deferred<number>()
        const reconn = new PersistentConnection({
            connect: async (addr: string) => {
                log.push(`connect ${addr}`)
                return new FakeConnection(addr)
            },
            strategy: () => 1000,
            onOpen: async (conn) => {
                log.push('onOpen')
                opened.resolve()
                await echoClient(conn)
            },
            onClose: () => { log.push('onClose') },
            onWait: (time) => {
                wait.resolve(time)
                log.push(`onWait ${time}`)
            },
        })

        reconn.connect('127.0.0.1:1234')
        await opened.promise

        reconn.connection?.close()
        expect(await wait.promise).toBe(1000)
        expect(reconn.isWaiting).toBe(true)

        await reconn.close()

        expect(log).toEqual([
            'connect 127.0.0.1:1234',
            'onOpen',
            'onClose',
            'onWait 1000',
        ])
    })

    it('should stop when .close() is called while connecting', async () => {
        const log: string[] = []

        const reconn = new PersistentConnection({
            connect: async (addr: string) => {
                log.push(`connect start ${addr}`)
                await sleep(10)
                log.push(`connect end ${addr}`)
                return new FakeConnection(addr)
            },
            onOpen: async (conn) => {
                log.push('onOpen')
                await echoClient(conn)
            },
            onClose: () => { log.push('onClose') },
        })

        reconn.connect('127.0.0.1:1234')
        const closePromise = reconn.close()
        log.push('close start')
        await vi.advanceTimersByTimeAsync(10)
        await closePromise
        log.push('close end')

        expect(log).toEqual([
            'connect start 127.0.0.1:1234',
            'close start',
            'connect end 127.0.0.1:1234',
            'close end',
        ])
    })

    it('should handle multiple .close() calls', async () => {
        const log: string[] = []

        const reconn = new PersistentConnection({
            connect: async (addr: string) => {
                log.push(`connect start ${addr}`)
                await sleep(10)
                log.push(`connect end ${addr}`)
                return new FakeConnection(addr)
            },
            onOpen: async (conn) => {
                log.push('onOpen')
                await echoClient(conn)
            },
            onClose: () => { log.push('onClose') },
        })

        reconn.connect('127.0.0.1:1234')
        const closePromise = reconn.close()
        const closePromise2 = reconn.close()
        log.push('close start')
        await vi.advanceTimersByTimeAsync(10)
        await Promise.all([closePromise, closePromise2])
        log.push('close end')

        expect(log).toEqual([
            'connect start 127.0.0.1:1234',
            'close start',
            'connect end 127.0.0.1:1234',
            'close end',
        ])
    })

    it('should stop when strategy returns false', async () => {
        const log: string[] = []

        const opened = new Deferred<void>()
        const reconn = new PersistentConnection({
            connect: async (addr: string) => {
                log.push(`connect ${addr}`)
                return new FakeConnection(addr)
            },
            strategy: () => false,
            onOpen: async (conn) => {
                log.push('onOpen')
                opened.resolve()
                await echoClient(conn)
            },
            onClose: () => { log.push('onClose') },
            onWait: (time) => { log.push(`onWait ${time}`) },
        })

        reconn.connect('127.0.0.1:1234')
        await opened.promise

        reconn.connection?.close()

        await vi.waitFor(() => {
            expect(reconn.isWaiting).toBe(false)
            expect(reconn.isConnected).toBe(false)
            expect(reconn.isConnecting).toBe(false)
        })

        expect(log).toEqual([
            'connect 127.0.0.1:1234',
            'onOpen',
            'onClose',
        ])
    })

    it('should stop when onOpen returns', async () => {
        const log: string[] = []

        const opened = new Deferred<void>()
        const reconn = new PersistentConnection({
            connect: async (addr: string) => {
                log.push(`connect ${addr}`)
                return new FakeConnection(addr)
            },
            strategy: () => false,
            onOpen: async () => {
                log.push('onOpen start')
                opened.resolve()

                await sleep(10)
                log.push('onOpen end')
            },
            onClose: () => { log.push('onClose') },
            onWait: (time) => { log.push(`onWait ${time}`) },
        })

        reconn.connect('127.0.0.1:1234')
        await opened.promise

        await vi.advanceTimersByTimeAsync(10)

        expect(reconn.isWaiting).toBe(false)
        expect(reconn.isConnected).toBe(false)
        expect(reconn.isConnecting).toBe(false)

        expect(log).toEqual([
            'connect 127.0.0.1:1234',
            'onOpen start',
            'onOpen end',
        ])
    })

    it('should stop when onOpen errors', async () => {
        const log: string[] = []

        const opened = new Deferred<void>()
        const reconn = new PersistentConnection({
            connect: async (addr: string) => {
                log.push(`connect ${addr}`)
                return new FakeConnection(addr)
            },
            strategy: () => false,
            onOpen: async () => {
                log.push('onOpen start')
                opened.resolve()

                await sleep(10)
                log.push('onOpen error')
                throw new Error('lol')
            },
            onClose: () => { log.push('onClose') },
            onWait: (time) => { log.push(`onWait ${time}`) },
        })

        reconn.connect('127.0.0.1:1234')
        await opened.promise

        await vi.advanceTimersByTimeAsync(10)

        expect(reconn.isWaiting).toBe(false)
        expect(reconn.isConnected).toBe(false)
        expect(reconn.isConnecting).toBe(false)

        expect(log).toEqual([
            'connect 127.0.0.1:1234',
            'onOpen start',
            'onOpen error',
            'onClose',
        ])
    })

    it('should reconnect when onOpen errors and onError returns reconnect', async () => {
        const log: string[] = []

        const opened = new Deferred<void>()
        const reconn = new PersistentConnection({
            connect: async (addr: string) => {
                log.push(`connect ${addr}`)
                return new FakeConnection(addr)
            },
            strategy: () => 1000,
            onOpen: async () => {
                log.push('onOpen start')
                opened.resolve()

                await sleep(10)

                log.push('onOpen error')
                throw new Error('lol')
            },
            onClose: () => { log.push('onClose') },
            onWait: (time) => { log.push(`onWait ${time}`) },
            onError: (err) => { log.push(`onError ${err.message}`); return 'reconnect' },
        })

        reconn.connect('127.0.0.1:1234')
        await opened.promise

        await vi.advanceTimersByTimeAsync(10)

        await reconn.close()

        expect(reconn.isWaiting).toBe(false)
        expect(reconn.isConnected).toBe(false)
        expect(reconn.isConnecting).toBe(false)

        expect(log).toEqual([
            'connect 127.0.0.1:1234',
            'onOpen start',
            'onOpen error',
            'onClose',
            'onError lol',
            'onWait 1000',
        ])
    })

    it('should reconnect without wait when onOpen errors and onError returns reconnect-now', async () => {
        const log: string[] = []

        const opened = new Deferred<void>()
        const reconn = new PersistentConnection({
            connect: async (addr: string) => {
                log.push(`connect ${addr}`)
                return new FakeConnection(addr)
            },
            strategy: () => 1000,
            onOpen: async () => {
                log.push('onOpen start')
                opened.resolve()

                await sleep(10)

                log.push('onOpen error')
                throw new Error('lol')
            },
            onClose: () => { log.push('onClose') },
            onWait: (time) => { log.push(`onWait ${time}`) },
            onError: (err) => { log.push(`onError ${err.message}`); return 'reconnect-now' },
        })

        reconn.connect('127.0.0.1:1234')
        await opened.promise

        await vi.advanceTimersByTimeAsync(10)

        const closePromise = reconn.close()
        log.push('close start')

        await vi.runAllTimersAsync()

        await closePromise
        log.push('close end')

        expect(reconn.isWaiting).toBe(false)
        expect(reconn.isConnected).toBe(false)
        expect(reconn.isConnecting).toBe(false)

        expect(log).toEqual([
            'connect 127.0.0.1:1234',
            'onOpen start',
            'onOpen error',
            'onClose',
            'onError lol',
            'onWait 0',
            'connect 127.0.0.1:1234',
            'onOpen start',
            'close start',
            'onOpen error',
            'onClose',
            'close end',
        ])
    })

    it('should close when onOpen errors and onError returns close', async () => {
        const log: string[] = []

        const opened = new Deferred<void>()
        const reconn = new PersistentConnection({
            connect: async (addr: string) => {
                log.push(`connect ${addr}`)
                return new FakeConnection(addr)
            },
            strategy: () => 1000,
            onOpen: async () => {
                log.push('onOpen start')
                opened.resolve()

                await sleep(10)

                log.push('onOpen error')
                throw new Error('lol')
            },
            onClose: () => { log.push('onClose') },
            onWait: (time) => { log.push(`onWait ${time}`) },
            onError: (err) => { log.push(`onError ${err.message}`); return 'close' },
        })

        reconn.connect('127.0.0.1:1234')
        await opened.promise

        await vi.advanceTimersByTimeAsync(10)

        await reconn.close()

        expect(reconn.isWaiting).toBe(false)
        expect(reconn.isConnected).toBe(false)
        expect(reconn.isConnecting).toBe(false)

        expect(log).toEqual([
            'connect 127.0.0.1:1234',
            'onOpen start',
            'onOpen error',
            'onClose',
            'onError lol',
        ])
    })

    it('should be reusable with another address', async () => {
        const log: string[] = []
        let opened = new Deferred<void>()
        const wait = new Deferred<number>()

        const reconn = new PersistentConnection({
            connect: async (addr: string) => {
                log.push(`connect ${addr}`)
                return new FakeConnection(addr)
            },
            onOpen: async (conn) => {
                log.push('onOpen')
                opened.resolve()
                await echoClient(conn)
            },
            onWait: (time) => {
                log.push(`onWait ${time}`)
                wait.resolve(time)
            },
            onClose: () => { log.push('onClose') },
        })

        expect(reconn.isConnected).toBe(false)
        expect(reconn.isConnecting).toBe(false)

        reconn.connect('127.0.0.1:1234')

        await vi.runAllTimersAsync()
        expect(reconn.isConnecting).toBe(false)
        expect(reconn.isConnected).toBe(true)
        expect(reconn.isWaiting).toBe(false)

        await opened.promise
        opened = new Deferred()

        const oldConn = reconn.connection
        expect(oldConn).toBeInstanceOf(FakeConnection)
        expect(oldConn?.address).toBe('127.0.0.1:1234')
        expect(reconn.isConnecting).toBe(false)
        expect(reconn.isConnected).toBe(true)
        expect(reconn.isWaiting).toBe(false)

        await reconn.close()

        reconn.connect('127.0.0.2:1234')
        await opened.promise

        expect(reconn.connection).toBeInstanceOf(FakeConnection)
        expect(reconn.connection?.address).toBe('127.0.0.2:1234')
        expect(reconn.connection).not.toBe(oldConn)
        expect(reconn.isConnecting).toBe(false)
        expect(reconn.isConnected).toBe(true)
        expect(reconn.isWaiting).toBe(false)

        await reconn.close()

        expect(log).toEqual([
            'connect 127.0.0.1:1234',
            'onOpen',
            'onClose',
            'connect 127.0.0.2:1234',
            'onOpen',
            'onClose',
        ])
    })
})
