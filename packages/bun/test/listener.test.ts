import type { TcpEndpoint } from '@fuman/net'
import type { TCPSocketListenOptions } from 'bun'
import { ListenerClosedError } from '@fuman/net'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { TcpListener } from '../src/listener.js'

const ENDPOINT: TcpEndpoint = { address: '127.0.0.1', port: 1234 }

describe('TcpListener', () => {
  const stop = vi.fn()
  let handlers: any

  vi.stubGlobal('Bun', {
    listen: vi.fn().mockImplementation((opts: TCPSocketListenOptions<unknown>) => {
      handlers = opts.socket
      return {
        stop,
        hostname: opts.hostname,
        port: opts.port || 34567,
      }
    }),
  })

  beforeEach(() => {
    stop.mockClear()
  })

  afterAll(() => { vi.unstubAllGlobals() })

  it('should reject in-flight accept with ListenerClosedError on close', async () => {
    const listener = new TcpListener()
    listener.listen(ENDPOINT)
    const pending = listener.accept()
    listener.close()

    await expect(pending).rejects.toThrow(ListenerClosedError)
    expect(stop).toHaveBeenCalledOnce()
  }, 1000)

  it('should reject accept after close with ListenerClosedError', async () => {
    const listener = new TcpListener()
    listener.listen(ENDPOINT)
    listener.close()

    await expect(listener.accept()).rejects.toThrow(ListenerClosedError)
    expect(stop).toHaveBeenCalledOnce()
  }, 1000)

  it('should not throw when an incoming socket closes without a waiter', () => {
    const listener = new TcpListener()
    listener.listen(ENDPOINT)
    const socket = {
      data: undefined,
      end: vi.fn(),
    }

    handlers.open(socket)
    expect(socket.end).toHaveBeenCalledOnce()
    expect(() => handlers.close(socket)).not.toThrow()
  })
})
