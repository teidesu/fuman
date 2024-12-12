import type * as streamWeb from 'node:stream/web'
import { Readable, Writable } from 'node:stream'

import { isNodeVersionAfter } from '../version.js'

/** convert a node Readable stream to a web ReadableStream */
export function nodeReadableToWeb(stream: Readable): ReadableStream<Uint8Array> {
    if (import.meta.env?.MODE !== 'test' && typeof Readable.toWeb === 'function') {
        return Readable.toWeb(stream) as unknown as ReadableStream<Uint8Array>
    }

    // otherwise, use a silly little adapter

    stream.pause()

    return new ReadableStream({
        start(c) {
            stream.on('data', (chunk) => {
                c.enqueue(chunk as Uint8Array)
            })
            stream.on('end', () => {
                c.close()
            })
            stream.on('error', (err) => {
                c.error(err)
            })
        },
        pull() {
            stream.resume()
        },
    })
}

/** convert a node Writable stream to a web WritableStream */
export function nodeWritableToWeb(writable: Writable): WritableStream<Uint8Array> {
    if (import.meta.env?.MODE !== 'test' && typeof Writable.toWeb === 'function') {
        return Writable.toWeb(writable) as unknown as WritableStream<Uint8Array>
    }

    return new WritableStream({
        write(chunk) {
            return new Promise<void>((resolve, reject) => {
                writable.write(chunk, (err) => {
                    if (err) reject(err)
                    else resolve()
                })
            })
        },
        close() {
            return new Promise<void>((resolve, reject) => {
                writable.end((err: unknown) => {
                    if (err != null) {
                        reject(err)
                    } else {
                        resolve()
                        writable.destroy()
                    }
                })
            })
        },
    })
}

/** convert a web ReadableStream to a node Readable */
export function webReadableToNode(stream: ReadableStream<Uint8Array>): Readable {
    if (
        import.meta.env?.MODE !== 'test'
            && typeof Readable.fromWeb === 'function'
            && isNodeVersionAfter(18, 13, 0) // https://github.com/nodejs/node/issues/42694
    ) {
        return Readable.fromWeb(stream as unknown as streamWeb.ReadableStream<Uint8Array>) as unknown as Readable
    }

    const reader = stream.getReader()
    let ended = false

    const readable = new Readable({
        async read() {
            try {
                const { done, value } = await reader.read()

                if (done) {
                    this.push(null)
                } else {
                    this.push(Buffer.from(value.buffer, value.byteOffset, value.byteLength))
                }
            } catch (err) {
                this.destroy(err as Error)
            }
        },
        destroy(error, cb) {
            if (!ended) {
                void reader
                    .cancel(error)
                    .catch(() => {})
                    .then(() => {
                        cb(error)
                    })

                return
            }

            cb(error)
        },
    })

    reader.closed
        .then(() => {
            ended = true
        })
        .catch((err) => {
            readable.destroy(err as Error)
        })

    return readable
}

/** convert a web WritableStream to a node Writable */
export function webWritableToNode(writable: WritableStream<Uint8Array>): Writable {
    if (import.meta.env?.MODE !== 'test' && typeof Writable.fromWeb === 'function') {
        return Writable.fromWeb(writable) as unknown as Writable
    }

    const writer = writable.getWriter()

    return new Writable({
        write(chunk, encoding, callback) {
            writer.write(chunk as Uint8Array)
                .then(() => callback())
                .catch(callback)
        },
        final(callback) {
            writer.close()
                .then(() => callback())
                .catch(callback)
        },
    })
}
