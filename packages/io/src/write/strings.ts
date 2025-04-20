import type { ISyncWritable } from '../types.js'
import { utf8 } from '@fuman/utils'

/** write a buffer to the stream */
export function bytes(writable: ISyncWritable, bytes: Uint8Array): void {
  writable.writeSync(bytes.length).set(bytes)
  writable.disposeWriteSync()
}

/** write a buffer to the stream, but in reverse order */
export function bytesReversed(writable: ISyncWritable, bytes: Uint8Array): void {
  const buf = writable.writeSync(bytes.length)
  buf.set(bytes)
  buf.reverse()
  writable.disposeWriteSync()
}

/** write a raw string to the stream (`.charCodeAt` is used to get the codepoints) */
export function rawString(writable: ISyncWritable, str: string): void {
  const buf = writable.writeSync(str.length)
  for (let i = 0; i < str.length; i++) {
    buf[i] = str.charCodeAt(i)
  }
  writable.disposeWriteSync()
}

/** write a utf8-encoded string to the stream */
export function utf8String(writable: ISyncWritable, str: string): void {
  const len = utf8.encodedLength(str)
  const buf = writable.writeSync(len)
  utf8.encoder.encodeInto(str, buf)
  writable.disposeWriteSync()
}

/** write a utf16-encoded string to the stream */
export function utf16beString(writable: ISyncWritable, str: string): void {
  const buf = writable.writeSync(str.length * 2)
  for (let i = 0, j = 0; i < str.length; i++, j += 2) {
    const char = str.charCodeAt(i)
    buf[j + 1] = char & 0xFF
    buf[j] = (char >> 8) & 0xFF
  }
  writable.disposeWriteSync()
}

/** write a utf16-encoded string to the stream */
export function utf16leString(writable: ISyncWritable, str: string): void {
  const buf = writable.writeSync(str.length * 2)
  for (let i = 0, j = 0; i < str.length; i++, j += 2) {
    const char = str.charCodeAt(i)
    buf[j] = char & 0xFF
    buf[j + 1] = (char >> 8) & 0xFF
  }
  writable.disposeWriteSync()
}

/** write a utf8-encoded string to the stream, with a null terminator */
export function cUtf8String(writable: ISyncWritable, str: string): void {
  const len = utf8.encodedLength(str)
  const buf = writable.writeSync(len + 1)
  utf8.encoder.encodeInto(str, buf)
  buf[len] = 0
  writable.disposeWriteSync()
}
