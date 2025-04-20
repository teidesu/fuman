import { Readable, Writable } from 'node:stream'

import { describe, expect, it } from 'vitest'

import { nodeReadableToWeb, nodeWritableToWeb, webReadableToNode } from './convert-web.js'

describe('nodeReadableToWeb', () => {
  it('should correctly convert a readable stream', async () => {
    const stream = new Readable({
      read() {
        this.push(Buffer.from([1, 2, 3]))

        this.push(Buffer.from([4, 5, 6]))
        this.push(null)
      },
    })

    const webStream = nodeReadableToWeb(stream)
    const reader = webStream.getReader()

    expect(await reader.read()).toEqual({ value: Buffer.from([1, 2, 3]), done: false })
    expect(await reader.read()).toEqual({ value: Buffer.from([4, 5, 6]), done: false })
    expect(await reader.read()).toEqual({ value: undefined, done: true })
  })
})

describe('webReadableToNode', () => {
  it('should correctly convert a readable stream', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]))
        controller.enqueue(new Uint8Array([4, 5, 6]))
        controller.close()
      },
    })

    const nodeStream = webReadableToNode(stream)
    const chunks: Buffer[] = []

    nodeStream.on('data', (chunk) => {
      chunks.push(chunk as Buffer)
    })

    await new Promise<void>((resolve, reject) => {
      nodeStream.on('end', () => {
        try {
          expect(chunks).toEqual([Buffer.from([1, 2, 3]), Buffer.from([4, 5, 6])])
          resolve()
        } catch (err) {
          reject(err)
        }
      })
    })
  })
})

describe('nodeWritableToWeb', () => {
  it('should correctly convert a writable stream', async () => {
    const chunks: Buffer[] = []
    let ended = false
    const stream = new Writable({
      write(chunk, encoding, callback) {
        chunks.push(chunk as Buffer)
        callback()
      },
      final(callback) {
        ended = true
        callback()
      },
    })

    const webStream = nodeWritableToWeb(stream)
    const writer = webStream.getWriter()

    await writer.write(new Uint8Array([1, 2, 3]))
    await writer.write(new Uint8Array([4, 5, 6]))
    await writer.close()

    expect(chunks).toEqual([Buffer.from([1, 2, 3]), Buffer.from([4, 5, 6])])
    expect(ended).toEqual(true)
  })
})
