import { Readable, Writable } from 'node:stream'

import { Bytes } from '@fuman/io'
import { describe, expect, it } from 'vitest'

import { fumanReadableToNode, fumanWritableToNode, nodeReadableToFuman, nodeWritableToFuman } from './convert-fuman.js'

describe('nodeReadableToFuman', () => {
  it('should correctly convert a readable stream', async () => {
    const stream = new Readable({
      read() {
        this.push(Buffer.from([1, 2, 3]))
        this.push(Buffer.from([4, 5, 6]))
        this.push(null)
      },
    })

    const fumanStream = nodeReadableToFuman(stream)

    const buf = new Uint8Array(10)
    const nread = await fumanStream.read(buf)

    expect(nread).to.equal(6)
    expect(buf).to.deep.equal(new Uint8Array([1, 2, 3, 4, 5, 6, 0, 0, 0, 0]))
  })
})

describe('nodeWritableToFuman', () => {
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

    const fumanStream = nodeWritableToFuman(stream)
    await fumanStream.write(new Uint8Array([1, 2, 3]))
    await fumanStream.write(new Uint8Array([4, 5, 6]))
    fumanStream.close()

    expect(chunks).toEqual([Buffer.from([1, 2, 3]), Buffer.from([4, 5, 6])])
    expect(ended).toEqual(true)
  })
})

describe('fumanReadableToNode', () => {
  it('should correctly convert a readable stream', async () => {
    const stream = Bytes.from(new Uint8Array([1, 2, 3, 4, 5, 6]))

    const nodeStream = fumanReadableToNode(stream)
    const chunks: Buffer[] = []

    nodeStream.on('data', (chunk) => {
      chunks.push(chunk as Buffer)
    })

    await new Promise<void>((resolve, reject) => {
      nodeStream.on('end', () => {
        try {
          expect(chunks).toEqual([Buffer.from([1, 2, 3, 4, 5, 6])])
          resolve()
        } catch (err) {
          reject(err)
        }
      })
    })
  })
})

describe('fumanWritableToNode', () => {
  it('should correctly convert a writable stream', async () => {
    const bytes = Bytes.alloc()

    const nodeStream = fumanWritableToNode(bytes)
    await new Promise<void>((resolve) => {
      nodeStream.write(Buffer.from([1, 2, 3]), () => {
        nodeStream.write(Buffer.from([4, 5, 6]), () => {
          nodeStream.end(() => {
            resolve()
          })
        })
      })
    })

    expect(bytes.result()).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6]))
  })
})
