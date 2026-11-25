import { ListenerClosedError } from '@fuman/net'
import { describe, expect, it } from 'vitest'
import { listenTcp } from './functions.js'

describe('TcpListener', () => {
  it('should throw ListenerClosedError on accept after close', async () => {
    const listener = await listenTcp({ address: '127.0.0.1', port: 0 })
    const closed = new Promise<void>((resolve) => {
      listener.server.once('close', () => resolve())
    })
    listener.close()
    await closed
    await expect(listener.accept()).rejects.toThrow(ListenerClosedError)
  })
})
