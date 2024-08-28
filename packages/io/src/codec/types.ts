import type { MaybePromise } from '@fuman/utils'

import type { Bytes } from '../bytes.js'
import type { ISyncWritable } from '../types.js'

export interface IFrameDecoder<Frame = Uint8Array> {
    /**
     * Decode a frame from a buffer
     *
     * > **Important**: When returning byte arrays, make sure that the returned array is **not**
     * > a view into the original buffer, as the underlying buffer may get invalidated
     */
    decode: (buf: Bytes, eof: boolean) => MaybePromise<Frame | null>
}

export interface IFrameEncoder<Frame = Uint8Array> {
    encode: (frame: Frame, into: ISyncWritable) => MaybePromise<void>
    reset: () => void
}
