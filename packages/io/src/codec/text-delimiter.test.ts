import { utf8 } from '@fuman/utils'
import { describe, expect, it } from 'vitest'

import { Bytes } from '../bytes.js'

import { FramedReader } from './reader.js'
import { TextDelimiterCodec } from './text-delimiter.js'
import { FramedWriter } from './writer.js'

describe('TextDelimiterCodec', () => {
  it('should frame by delimiter', async () => {
    const decoder = new TextDelimiterCodec(new Uint8Array([10]))
    const buf = utf8.encoder.encode('Hello\nWorld\n')
    const readable = Bytes.from(buf)

    const reader = new FramedReader(readable, decoder)

    expect(await reader.read()).toEqual('Hello')
    expect(await reader.read()).toEqual('World')
    expect(await reader.read()).toBeNull()
  })

  it('should keep the delimiter if asked to', async () => {
    const decoder = new TextDelimiterCodec(new Uint8Array([10]), { strategy: 'keep' })
    const buf = utf8.encoder.encode('Hello\nWorld\n')
    const readable = Bytes.from(buf)

    const reader = new FramedReader(readable, decoder)

    expect(await reader.read()).toEqual('Hello\n')
    expect(await reader.read()).toEqual('World\n')
    expect(await reader.read()).toBeNull()
  })

  it('should write with delimiter', async () => {
    const encoder = new TextDelimiterCodec(new Uint8Array([10]))
    const buf = Bytes.alloc()
    const writer = new FramedWriter(buf, encoder)

    await writer.write('Hello')
    await writer.write('World')

    expect(buf.result()).toEqual(utf8.encoder.encode('Hello\nWorld\n'))
  })
})
