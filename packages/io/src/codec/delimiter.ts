import type { Bytes } from '../bytes.js'
import type { ISyncWritable } from '../types.js'
import type { IFrameDecoder, IFrameEncoder } from './types.js'
import { typed } from '@fuman/utils'

/** options for {@link DelimiterCodec} */
export interface DelimiterCodecOptions {
  /**
   * Strategy for handling delimiter.
   *  - `keep` - delimiter is kept at the end of each frame
   *  - `discard` - delimiter is discarded
   *
   * Ignored for encoding (delimiter is always appended after the frame)
   *
   * @default 'discard'
   */
  strategy?: 'keep' | 'discard'
}

/** a simple frame codec that uses a delimiter to separate frames */
export class DelimiterCodec implements IFrameDecoder, IFrameEncoder {
  #strategy: DelimiterCodecOptions['strategy']
  /**
   * @param delimiter  delimiter to use
   * @param options  options
   */
  constructor(
    readonly delimiter: Uint8Array,
    readonly options?: DelimiterCodecOptions | undefined,
  ) {
    this.#strategy = options?.strategy ?? 'discard'
  }

  decode(buf: Bytes, eof: boolean): Uint8Array | null {
    const { delimiter } = this

    const data = buf.readSync(buf.available)
    if (eof && data.length === 0) {
      return null
    }

    const delimiterIdx = typed.indexOfArray(data, delimiter)
    if (delimiterIdx === -1) {
      if (eof) {
        // no delimiter found, but we reached the end, so we return the remaining data
        return data
      }

      buf.rewind(data.length)
      return null
    }

    buf.rewind(data.length - delimiterIdx - delimiter.length)

    const frameEnd = this.#strategy === 'keep' ? delimiterIdx + delimiter.length : delimiterIdx
    return data.slice(0, frameEnd)
  }

  encode(data: Uint8Array, into: ISyncWritable): void {
    const buf = into.writeSync(data.length + this.delimiter.length)
    buf.set(data)
    buf.set(this.delimiter, data.length)
    into.disposeWriteSync()
  }

  reset(): void {}
}
