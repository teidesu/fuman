/// Based on https://github.com/mitschabaude/fast-base64/blob/main/js.js, MIT license

import { u8 } from '../arrays/index.js'

import { decoder, encoder } from './utf8.js'

const alphabet
  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const lookup = Object.fromEntries(
  Array.from(alphabet).map((a, i) => [a.charCodeAt(0), i]),
)
lookup['='.charCodeAt(0)] = 0
lookup['-'.charCodeAt(0)] = 62
lookup['_'.charCodeAt(0)] = 63

const encodeLookup = Object.fromEntries(
  Array.from(alphabet).map((a, i) => [i, a.charCodeAt(0)]),
)

// shim for deno
declare const Buffer: typeof import('node:buffer').Buffer

// https://github.com/tc39/proposal-arraybuffer-base64
const HAS_FROM_BASE64 = typeof Uint8Array.fromBase64 === 'function'
const HAS_TO_BASE64 = typeof Uint8Array.prototype.toBase64 === 'function'

export function decode(base64: string, url: boolean = false): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    const buf = Buffer.from(base64, url ? 'base64url' : 'base64')
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
  }
  if (HAS_FROM_BASE64) {
    // eslint-disable-next-line ts/no-unsafe-return
    return Uint8Array.fromBase64(base64, { alphabet: url ? 'base64url' : 'base64' })
  }

  base64 = base64.replace(/=+$/g, '')
  const n = base64.length
  const rem = n % 4
  const k = rem && rem - 1 // how many bytes the last base64 chunk encodes
  const m = (n >> 2) * 3 + k // total encoded bytes

  const encoded = u8.alloc(n + 3)
  encoder.encodeInto(`${base64}===`, encoded)

  for (let i = 0, j = 0; i < n; i += 4, j += 3) {
    const x
      = (lookup[encoded[i]] << 18)
        + (lookup[encoded[i + 1]] << 12)
        + (lookup[encoded[i + 2]] << 6)
        + lookup[encoded[i + 3]]
    encoded[j] = x >> 16
    encoded[j + 1] = (x >> 8) & 0xFF
    encoded[j + 2] = x & 0xFF
  }
  return new Uint8Array(encoded.buffer, encoded.byteOffset, m)
}

const TO_BASE64_OPTIONS = { alphabet: 'base64', omitPadding: false } as const
const TO_BASE64_URL_OPTIONS = { alphabet: 'base64url', omitPadding: true } as const
export function encode(bytes: Uint8Array, url: boolean = false): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString(url ? 'base64url' : 'base64')
  }
  if (HAS_TO_BASE64) {
    return bytes.toBase64(url ? TO_BASE64_URL_OPTIONS : TO_BASE64_OPTIONS)
  }

  const m = bytes.length
  const k = m % 3
  const n = Math.floor(m / 3) * 4 + (k && k + 1)
  const N = Math.ceil(m / 3) * 4
  const encoded = u8.alloc(N)

  for (let i = 0, j = 0; j < m; i += 4, j += 3) {
    const y = (bytes[j] << 16) + (bytes[j + 1] << 8) + (bytes[j + 2] | 0)
    encoded[i] = encodeLookup[y >> 18]
    encoded[i + 1] = encodeLookup[(y >> 12) & 0x3F]
    encoded[i + 2] = encodeLookup[(y >> 6) & 0x3F]
    encoded[i + 3] = encodeLookup[y & 0x3F]
  }

  let base64 = decoder.decode(new Uint8Array(encoded.buffer, encoded.byteOffset, n))
  if (url) {
    base64 = base64.replace(/\+/g, '-').replace(/\//g, '_')
  } else {
    if (k === 1) base64 += '=='
    if (k === 2) base64 += '='
  }

  return base64
}

export function encodedLength(n: number): number {
  return Math.ceil(n / 3) * 4
}

export function decodedLength(n: number): number {
  return Math.ceil(n / 4) * 3
}
