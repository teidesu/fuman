import { ListenerClosedError } from '@fuman/net'
import { describe, expect, it } from 'vitest'
import { listenWs } from './websocket.js'

describe('NodeWebSocketServer', () => {
  it('should throw ListenerClosedError on accept after close', async () => {
    const listener = listenWs({ host: '127.0.0.1', port: 0 })
    const closed = new Promise<void>((resolve) => {
      listener.server.once('close', () => resolve())
    })
    listener.close()
    await closed
    await expect(listener.accept()).rejects.toThrow(ListenerClosedError)
  })

  it('should throw ListenerClosedError on accept after close while a client is open', async () => {
    const listener = listenWs({ host: '127.0.0.1', port: 0 })
    if (listener.address == null) {
      await new Promise<void>((resolve) => {
        listener.server.once('listening', () => resolve())
      })
    }

    const address = listener.address
    if (address == null) {
      throw new Error('listener is not bound')
    }

    const pending = listener.accept()
    const client = new WebSocket(`ws://127.0.0.1:${address.port}`)
    const conn = await pending

    listener.close()
    try {
      await expect(listener.accept()).rejects.toThrow(ListenerClosedError)
    } finally {
      conn.close()
      client.close()
    }
  })
})
