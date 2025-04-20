import type { Bytes } from '../bytes.js'
import type { ISyncWritable } from '../types.js'
import type { DelimiterCodecOptions } from './delimiter.js'
import type { IFrameDecoder, IFrameEncoder } from './types.js'
import { utf8 } from '@fuman/utils'

import { DelimiterCodec } from './delimiter.js'

/** wrapper over {@link DelimiterCodec} that handles text frames */
export class TextDelimiterCodec implements IFrameDecoder<string>, IFrameEncoder<string> {
  #inner: DelimiterCodec

  constructor(
    delimiter: Uint8Array | string,
    options?: DelimiterCodecOptions,
  ) {
    if (typeof delimiter === 'string') {
      delimiter = utf8.encoder.encode(delimiter)
    }
    this.#inner = new DelimiterCodec(delimiter, options)
  }

  decode(buf: Bytes, eof: boolean): string | null {
    const data = this.#inner.decode(buf, eof)
    return data === null ? null : utf8.decoder.decode(data)
  }

  encode(data: string, into: ISyncWritable): void {
    this.#inner.encode(utf8.encoder.encode(data), into)
  }

  reset(): void {
    this.#inner.reset()
  }
}
