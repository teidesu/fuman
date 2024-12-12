import type { MaybePromise } from '@fuman/utils'

import type { Bytes } from '../bytes.js'
import type { ISyncWritable } from '../types.js'

export interface IFrameDecoder<Frame = Uint8Array> {
    /**
     * Decode a frame from a buffer
     *
     * > **Important implementation notice**: When returning byte arrays, make sure that the returned array is **not**
     * > a view into the original buffer, as the underlying buffer may get invalidated
     */
    decode: (buf: Bytes, eof: boolean) => MaybePromise<Frame | null>
}

export interface IFrameEncoder<Frame = Uint8Array> {
    /** Encode a frame into a writable stream */
    encode: (frame: Frame, into: ISyncWritable) => MaybePromise<void>
    /** Reset the encoder, should it have any internal state */
    reset: () => void
}
