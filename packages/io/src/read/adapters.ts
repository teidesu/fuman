import type { IClosable, IReadable, ISyncReadable } from '../types.js'
import { Bytes } from '../bytes.js'
import { isByobCapableStream } from '../streams.js'

/** create an async readable stream from a sync readable stream */
export function fumanSyncReadableToAsync(readable: ISyncReadable): IReadable {
    return {
        async read(into: Uint8Array): Promise<number> {
            const buf = readable.readSync(into.length)
            into.set(buf)
            return buf.length
        },
    }
}

/** convert a web ReadableStream to a fuman readable stream */
export function webReadableToFuman(readable: ReadableStream<Uint8Array>): IReadable & IClosable {
    if (isByobCapableStream(readable)) {
        const reader = readable.getReader({ mode: 'byob' })

        return {
            async read(into: Uint8Array): Promise<number> {
                // create a new uint8array because the reader will detach it
                const temp = new Uint8Array(into.length)
                const { value, done } = await reader.read(temp)
                if (done) return 0

                into.set(value)
                return value.byteLength
            },

            close() {
                reader.cancel().catch(() => {})
            },
        }
    }

    const reader = readable.getReader()
    const buf = Bytes.alloc()

    return {
        async read(into: Uint8Array): Promise<number> {
            if (buf.available === 0) {
                const { value, done } = await reader.read()
                if (done) return 0
                buf.writeSync(value.byteLength).set(value)
                buf.disposeWriteSync()
            }

            const read = Math.min(into.length, buf.available)
            into.set(buf.readSync(read), 0)
            buf.reclaim()
            return read
        },

        close() {
            reader.cancel().catch(() => {})
        },
    }
}

/** convert a fuman readable stream to a web ReadableStream */
export function fumanReadableToWeb(readable: IReadable): ReadableStream<Uint8Array> {
    return new ReadableStream({
        type: 'bytes',
        async pull(controller) {
            if (controller.byobRequest) {
                if (!controller.byobRequest.view) {
                    controller.byobRequest.respond(0)
                    return
                }

                const view = new Uint8Array(
                    controller.byobRequest.view.buffer,
                    controller.byobRequest.view.byteOffset,
                    controller.byobRequest.view.byteLength,
                )
                const nread = await readable.read(view)
                if (nread === 0) {
                    controller.close()
                    controller.byobRequest.respond(0)
                    return
                }

                controller.byobRequest.respond(nread)
                return
            }

            const buf = new Uint8Array(1024 * 32)
            let nread = 0

            while (nread === 0) {
                nread = await readable.read(buf)
                if (nread === 0) break
                controller.enqueue(buf.subarray(0, nread))
            }

            if (nread === 0) {
                controller.close()
            }
        },
    })
}
