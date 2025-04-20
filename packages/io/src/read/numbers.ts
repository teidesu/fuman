import type { ISyncReadable } from '../types.js'
import { getDv } from '../_utils.js'
import { PartialReadError } from '../errors.js'

import { exactly } from './strings.js'

/** read a uint8 from the source */
export function uint8(readable: ISyncReadable): number {
  return exactly(readable, 1)[0]
}

function _maybeRead(readable: ISyncReadable | Uint8Array, size: number): Uint8Array {
  if (ArrayBuffer.isView(readable)) {
    if (readable.byteLength < size) {
      throw new PartialReadError(readable, size)
    }
    return readable
  }

  return exactly(readable, size)
}

/** read an int8 from the source (fuman readable stream or a buffer) */
export function int8(readable: ISyncReadable | Uint8Array): number {
  const val = _maybeRead(readable, 1)[0]
  if (!(val & 0x80)) return val
  return -(0xFF - val + 1)
}

/** read a uint16 (little endian) from the source (fuman readable stream or a buffer) */
export function uint16le(readable: ISyncReadable | Uint8Array): number {
  const buffer = _maybeRead(readable, 2)

  return buffer[0] | (buffer[1] << 8)
}

/** read a uint16 (big endian) from the source (fuman readable stream or a buffer) */
export function uint16be(readable: ISyncReadable | Uint8Array): number {
  const buffer = _maybeRead(readable, 2)

  return (buffer[0] << 8) | buffer[1]
}

/** read a uint24 (little endian) from the source (fuman readable stream or a buffer) */
export function uint24le(readable: ISyncReadable | Uint8Array): number {
  const buffer = _maybeRead(readable, 3)

  return (
    buffer[0]
    | (buffer[1] << 8)
    | (buffer[2] << 16)
  )
}

/** read a uint24 (big endian) from the source (fuman readable stream or a buffer) */
export function uint24be(readable: ISyncReadable | Uint8Array): number {
  const buffer = _maybeRead(readable, 3)

  return (
    (buffer[0] << 16)
    | (buffer[1] << 8)
    | buffer[2]
  )
}

/** read a uint32 (little endian) from the source (fuman readable stream or a buffer) */
export function uint32le(readable: ISyncReadable | Uint8Array): number {
  const buffer = _maybeRead(readable, 4)

  return (
    buffer[0]
    | (buffer[1] << 8)
    | (buffer[2] << 16))
  + (buffer[3] * 0x1000000)
}

/** read a uint32 (big endian) from the source (fuman readable stream or a buffer) */
export function uint32be(readable: ISyncReadable | Uint8Array): number {
  const buffer = _maybeRead(readable, 4)

  return buffer[0] * 0x1000000 + (
    (buffer[1] << 16)
    | (buffer[2] << 8)
    | buffer[3]
  )
}

/** read a uint64 (little endian) from the source (fuman readable stream or a buffer) */
export function uint64le(readable: ISyncReadable | Uint8Array): bigint {
  const buffer = _maybeRead(readable, 8)
  const lo = (
    buffer[0]
    | (buffer[1] << 8)
    | (buffer[2] << 16))
  + (buffer[3] * 0x1000000)

  const hi = (
    buffer[4]
    | (buffer[5] << 8)
    | (buffer[6] << 16))
  + (buffer[7] * 0x1000000)

  return BigInt(lo) | (BigInt(hi) << 32n)
}

/** read a uint64 (big endian) from the source (fuman readable stream or a buffer) */
export function uint64be(readable: ISyncReadable | Uint8Array): bigint {
  const buffer = _maybeRead(readable, 8)
  const lo = buffer[0] * 0x1000000 + (
    (buffer[1] << 16)
    | (buffer[2] << 8)
    | buffer[3]
  )
  const hi = buffer[4] * 0x1000000 + (
    (buffer[5] << 16)
    | (buffer[6] << 8)
    | buffer[7]
  )

  return BigInt(lo) << 32n | BigInt(hi)
}

/** read an int16 (little endian) from the source (fuman readable stream or a buffer) */
export function int16le(readable: ISyncReadable | Uint8Array): number {
  const buffer = _maybeRead(readable, 2)

  const val = buffer[0] | (buffer[1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

/** read an int16 (big endian) from the source (fuman readable stream or a buffer) */
export function int16be(readable: ISyncReadable | Uint8Array): number {
  const buffer = _maybeRead(readable, 2)
  const val = (buffer[0] << 8) | buffer[1]
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

/** read an int24 (little endian) from the source (fuman readable stream or a buffer) */
export function int24le(readable: ISyncReadable | Uint8Array): number {
  const buffer = _maybeRead(readable, 3)

  const val = (
    buffer[0]
    | (buffer[1] << 8)
    | (buffer[2] << 16)
  )

  return (val & 0x800000) ? val | 0xFF000000 : val
}

/** read an int24 (big endian) from the source (fuman readable stream or a buffer) */
export function int24be(readable: ISyncReadable | Uint8Array): number {
  const buffer = _maybeRead(readable, 3)

  const val = (
    (buffer[0] << 16)
    | (buffer[1] << 8)
    | buffer[2]
  )

  return (val & 0x800000) ? val | 0xFF000000 : val
}

/** read an int32 (little endian) from the source (fuman readable stream or a buffer) */
export function int32le(readable: ISyncReadable | Uint8Array): number {
  const buffer = _maybeRead(readable, 4)

  return (
    buffer[0]
    | (buffer[1] << 8)
    | (buffer[2] << 16)
    | (buffer[3] << 24)
  )
}

/** read an int32 (big endian) from the source (fuman readable stream or a buffer) */
export function int32be(readable: ISyncReadable | Uint8Array): number {
  const buffer = _maybeRead(readable, 4)

  return (
    (buffer[0] << 24)
    | (buffer[1] << 16)
    | (buffer[2] << 8)
    | buffer[3]
  )
}

/** read an int64 (little endian) from the source (fuman readable stream or a buffer) */
export function int64le(readable: ISyncReadable | Uint8Array): bigint {
  const buffer = _maybeRead(readable, 8)
  const val = buffer[4]
    + buffer[5] * 2 ** 8
    + buffer[6] * 2 ** 16
    + (buffer[7] << 24) // Overflow

  return (BigInt(val) << 32n)
    + BigInt(buffer[0]
      + buffer[1] * 2 ** 8
      + buffer[2] * 2 ** 16
      + buffer[3] * 2 ** 24)
}

/** read an int64 (big endian) from the source (fuman readable stream or a buffer) */
export function int64be(readable: ISyncReadable | Uint8Array): bigint {
  const buffer = _maybeRead(readable, 8)

  const val = (buffer[0] << 24) // Overflow
    + buffer[1] * 2 ** 16
    + buffer[2] * 2 ** 8
    + buffer[3]

  return (BigInt(val) << 32n)
    + BigInt(buffer[4] * 2 ** 24
      + buffer[5] * 2 ** 16
      + buffer[6] * 2 ** 8
      + buffer[7])
}

/** read a variable-size uint (little endian) from the source (fuman readable stream or a buffer) */
export function uintle(readable: ISyncReadable | Uint8Array, size: number): bigint {
  const buffer = _maybeRead(readable, size)
  let val = BigInt(buffer[0])
  let mul = 1
  let i = 0
  // eslint-disable-next-line no-cond-assign
  while (++i < size && (mul *= 0x100)) {
    val |= BigInt(buffer[i] * mul)
  }

  return val
}

/** read a variable-size uint (big endian) from the source (fuman readable stream or a buffer) */
export function uintbe(readable: ISyncReadable | Uint8Array, size: number): bigint {
  const buffer = _maybeRead(readable, size)

  let val = BigInt(buffer[--size])
  let mul = 1
  // eslint-disable-next-line no-cond-assign
  while (size > 0 && (mul *= 0x100)) {
    val |= BigInt(buffer[--size] * mul)
  }

  return val
}

/** read a variable-size int (big endian) from the source (fuman readable stream or a buffer) */
export function intbe(readable: ISyncReadable | Uint8Array, size: number): bigint {
  const buffer = _maybeRead(readable, size)

  let i = size - 1
  let mul = 1
  let val = BigInt(buffer[i])
  // eslint-disable-next-line no-cond-assign
  while (i > 0 && (mul *= 0x100)) {
    val |= BigInt(buffer[--i] * mul)
  }
  mul *= 0x80

  if (val >= mul) val -= 2n ** BigInt(8 * size)

  return val
}

/** read a variable-size int (little endian) from the source (fuman readable stream or a buffer) */
export function intle(readable: ISyncReadable | Uint8Array, size: number): bigint {
  const buffer = _maybeRead(readable, size)

  let val = BigInt(buffer[0])
  let mul = 1
  let i = 0
  // eslint-disable-next-line no-cond-assign
  while (++i < size && (mul *= 0x100)) {
    val |= BigInt(buffer[i] * mul)
  }
  mul *= 0x80

  if (val >= mul) val -= 2n ** BigInt(8 * size)

  return val
}

/** read a float32 (little endian) from the source (fuman readable stream or a buffer) */
export function float32le(readable: ISyncReadable | Uint8Array): number {
  const buffer = _maybeRead(readable, 4)
  return getDv(buffer).getFloat32(buffer.byteOffset, true)
}

/** read a float32 (big endian) from the source (fuman readable stream or a buffer) */
export function float32be(readable: ISyncReadable | Uint8Array): number {
  const buffer = _maybeRead(readable, 4)
  return getDv(buffer).getFloat32(buffer.byteOffset, false)
}

/** read a float64 (little endian) from the source (fuman readable stream or a buffer) */
export function float64le(readable: ISyncReadable | Uint8Array): number {
  const buffer = _maybeRead(readable, 8)
  return getDv(buffer).getFloat64(buffer.byteOffset, true)
}

/** read a float64 (big endian) from the source (fuman readable stream or a buffer) */
export function float64be(readable: ISyncReadable | Uint8Array): number {
  const buffer = _maybeRead(readable, 8)
  return getDv(buffer).getFloat64(buffer.byteOffset, false)
}
