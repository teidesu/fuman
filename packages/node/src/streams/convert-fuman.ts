import type { IClosable, IReadable, IWritable } from '@fuman/io'
import { Readable, Writable } from 'node:stream'

import { Deferred, Deque } from '@fuman/utils'

export function nodeReadableToFuman(stream: Readable): IReadable & IClosable {
    let ended = false
    const waiters = new Deque<Deferred<void>>()

    stream.on('ended', () => {
        ended = true
        while (waiters.length > 0) {
            // eslint-disable-next-line ts/no-non-null-assertion
            waiters.popFront()!.resolve()
        }
    })

    stream.on('readable', () => {
        waiters.popFront()?.resolve()
    })

    return {
        async read(into: Uint8Array): Promise<number> {
            if (ended) return 0

            let buf = stream.read(into.length) as Buffer | null
            if (buf === null) {
                // end of stream or end of buffered data
                // if it's the latter, we need to read more
                if (stream.readableEnded) return 0

                const deferred = new Deferred<void>()
                waiters.pushBack(deferred)
                await deferred.promise

                buf = stream.read(into.length) as Buffer | null
                // if still null, we're at the end of the stream
                if (buf === null) return 0
            }

            into.set(buf)
            return buf.length
        },
        close() {
            ended = true
            stream.destroy()
        },
    }
}

export function fumanReadableToNode(stream: IReadable): Readable {
    return new Readable({
        read(size: number) {
            void (async () => {
                try {
                    const buf = new Uint8Array(size)
                    const nread = await stream.read(buf)

                    if (nread === 0) {
                        this.push(null)
                    } else {
                        this.push(Buffer.from(buf.subarray(0, nread)))
                    }
                } catch (err) {
                    this.destroy(err as Error)
                }
            })()
        },
    })
}

export function nodeWritableToFuman(writable: Writable): IWritable & IClosable {
    let ended = false
    const waiters = new Deque<Deferred<void>>()

    writable.on('finish', () => {
        ended = true
        while (waiters.length > 0) {
            // eslint-disable-next-line ts/no-non-null-assertion
            waiters.popFront()!.resolve()
        }
    })

    let full = false
    writable.on('drain', () => {
        full = false
        waiters.popFront()?.resolve()
    })

    return {
        async write(bytes: Uint8Array): Promise<void> {
            if (ended) return

            if (full) {
                const deferred = new Deferred<void>()
                waiters.pushBack(deferred)
                await deferred.promise
            }

            await new Promise<void>((resolve, reject) => {
                const written = writable.write(bytes, (err) => {
                    if (err) reject(err)
                    else resolve()
                })
                if (!written) {
                    full = true
                    const deferred = new Deferred<void>()
                    waiters.pushBack(deferred)
                    resolve(deferred.promise)
                }
            })
        },
        close() {
            ended = true
            writable.end()
        },
    }
}

export function fumanWritableToNode(writable: IWritable): Writable {
    return new Writable({
        write(chunk, encoding, callback) {
            void (async () => {
                try {
                    await writable.write(chunk as Uint8Array)
                    callback()
                } catch (err) {
                    callback(err as Error)
                }
            })()
        },
        final(callback) {
            if (!('close' in writable)) {
                callback()
                return
            }

            void (async () => {
                try {
                    (writable as unknown as IClosable).close()
                    callback()
                } catch (err) {
                    callback(err as Error)
                }
            })()
        },
    })
}
