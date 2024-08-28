export function isByobCapableStream(stream: ReadableStream<Uint8Array>): boolean {
    try {
        const reader = stream.getReader({ mode: 'byob' })
        reader.releaseLock()
        return true
    } catch (e) {
        // > If stream.[[controller]] does not implement ReadableByteStreamController, throw a TypeError exception.
        // https://streams.spec.whatwg.org/#set-up-readable-stream-byob-reader
        if (e instanceof TypeError) {
            return false
        }

        throw e
    }
}
