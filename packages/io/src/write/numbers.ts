import type { ISyncWritable } from '../types.js'
import { getDv } from '../_utils.js'

function _maybeWrite(writable: ISyncWritable | Uint8Array, size: number): Uint8Array {
  if (ArrayBuffer.isView(writable)) {
    return writable.subarray(0, size)
  } else {
    return writable.writeSync(size)
  }
}

function _checkInt(value: number | bigint, min: number | bigint, max: number | bigint): void {
  if (value < min || value > max) {
    throw new RangeError(`value out of bounds: ${value} (${min} ≤ value ≤ ${max})`)
  }
}

/** write a uint8 to the target (fuman writable stream or a buffer) */
export function uint8(writable: ISyncWritable | Uint8Array, value: number, noAssert = false): void {
  if (!noAssert) _checkInt(value, 0, 0xFF)
  const buf = _maybeWrite(writable, 1)
  if (value < 0) value = 0x100 + value
  buf[0] = (value & 0xFF)
}

/** write an int8 to the target (fuman writable stream or a buffer) */
export function int8(writable: ISyncWritable | Uint8Array, value: number, noAssert = false): void {
  if (!noAssert) _checkInt(value, -0x80, 0x7F)
  const buf = _maybeWrite(writable, 1)
  if (value < 0) value = 0xFF + value + 1
  buf[0] = (value & 0xFF)
}

/** write a uint16 (little endian) to the target (fuman writable stream or a buffer) */
export function uint16le(writable: ISyncWritable | Uint8Array, value: number, noAssert = false): void {
  if (!noAssert) _checkInt(value, 0, 0xFFFF)
  const buf = _maybeWrite(writable, 2)
  buf[0] = (value & 0xFF)
  buf[1] = (value >>> 8)
}

/** write a uint16 (big endian) to the target (fuman writable stream or a buffer) */
export function uint16be(writable: ISyncWritable | Uint8Array, value: number, noAssert = false): void {
  if (!noAssert) _checkInt(value, 0, 0xFFFF)
  const buf = _maybeWrite(writable, 2)
  buf[0] = (value >>> 8)
  buf[1] = (value & 0xFF)
}

/** write an int16 (little endian) to the target (fuman writable stream or a buffer) */
export function int16le(writable: ISyncWritable | Uint8Array, value: number, noAssert = false): void {
  const buf = _maybeWrite(writable, 2)
  if (!noAssert) _checkInt(value, -0x8000, 0x7FFF)
  buf[0] = (value & 0xFF)
  buf[1] = (value >>> 8)
}

/** write an int16 (big endian) to the target (fuman writable stream or a buffer) */
export function int16be(writable: ISyncWritable | Uint8Array, value: number, noAssert = false): void {
  const buf = _maybeWrite(writable, 2)
  if (!noAssert) _checkInt(value, -0x8000, 0x7FFF)
  buf[0] = (value >>> 8)
  buf[1] = (value & 0xFF)
}

/** write a uint24 (little endian) to the target (fuman writable stream or a buffer) */
export function uint24le(writable: ISyncWritable | Uint8Array, value: number, noAssert = false): void {
  if (!noAssert) _checkInt(value, 0, 0xFFFFFF)

  const buf = _maybeWrite(writable, 3)
  buf[0] = value
  value = value >>> 8
  buf[1] = value
  value = value >>> 8
  buf[2] = value
}

/** write a uint24 (big endian) to the target (fuman writable stream or a buffer) */
export function uint24be(writable: ISyncWritable | Uint8Array, value: number, noAssert = false): void {
  if (!noAssert) _checkInt(value, 0, 0xFFFFFF)

  const buf = _maybeWrite(writable, 3)
  buf[2] = value
  value = value >>> 8
  buf[1] = value
  value = value >>> 8
  buf[0] = value
}

/** write an int24 (little endian) to the target (fuman writable stream or a buffer) */
export function int24le(writable: ISyncWritable | Uint8Array, value: number, noAssert = false): void {
  if (!noAssert) _checkInt(value, -0x800000, 0x7FFFFF)

  const buf = _maybeWrite(writable, 3)
  buf[0] = value
  value = value >>> 8
  buf[1] = value
  value = value >>> 8
  buf[2] = value
}

/** write an int24 (big endian) to the target (fuman writable stream or a buffer) */
export function int24be(writable: ISyncWritable | Uint8Array, value: number, noAssert = false): void {
  if (!noAssert) _checkInt(value, -0x800000, 0x7FFFFF)

  const buf = _maybeWrite(writable, 3)
  buf[2] = value
  value = value >>> 8
  buf[1] = value
  value = value >>> 8
  buf[0] = value
}

/** write a uint32 (little endian) to the target (fuman writable stream or a buffer) */
export function uint32le(writable: ISyncWritable | Uint8Array, value: number, noAssert = false): void {
  const buf = _maybeWrite(writable, 4)
  if (!noAssert) _checkInt(value, 0, 0xFFFFFFFF)

  buf[0] = value
  value = value >>> 8
  buf[1] = value
  value = value >>> 8
  buf[2] = value
  value = value >>> 8
  buf[3] = value
}

/** write a uint32 (big endian) to the target (fuman writable stream or a buffer) */
export function uint32be(writable: ISyncWritable | Uint8Array, value: number, noAssert = false): void {
  const buf = _maybeWrite(writable, 4)
  if (!noAssert) _checkInt(value, 0, 0xFFFFFFFF)

  buf[3] = value
  value = value >>> 8
  buf[2] = value
  value = value >>> 8
  buf[1] = value
  value = value >>> 8
  buf[0] = value
}

/** write an int32 (little endian) to the target (fuman writable stream or a buffer) */
export function int32le(writable: ISyncWritable | Uint8Array, value: number, noAssert = false): void {
  const buf = _maybeWrite(writable, 4)
  if (!noAssert) _checkInt(value, -0x80000000, 0x7FFFFFFF)

  buf[0] = value
  value = value >>> 8
  buf[1] = value
  value = value >>> 8
  buf[2] = value
  value = value >>> 8
  buf[3] = value
}

/** write an int32 (big endian) to the target (fuman writable stream or a buffer) */
export function int32be(writable: ISyncWritable | Uint8Array, value: number, noAssert = false): void {
  const buf = _maybeWrite(writable, 4)
  if (!noAssert) _checkInt(value, -0x80000000, 0x7FFFFFFF)

  buf[3] = value
  value = value >>> 8
  buf[2] = value
  value = value >>> 8
  buf[1] = value
  value = value >>> 8
  buf[0] = value
}

/** write a uint64 (little endian) to the target (fuman writable stream or a buffer) */
export function uint64le(writable: ISyncWritable | Uint8Array, value: bigint, noAssert = false): void {
  const buf = _maybeWrite(writable, 8)
  if (!noAssert) _checkInt(value, 0n, 0xFFFFFFFFFFFFFFFFn)

  let lo = Number(value & 0xFFFFFFFFn)
  buf[0] = lo
  lo = lo >> 8
  buf[1] = lo
  lo = lo >> 8
  buf[2] = lo
  lo = lo >> 8
  buf[3] = lo
  let hi = Number(value >> 32n & 0xFFFFFFFFn)
  buf[4] = hi
  hi = hi >> 8
  buf[5] = hi
  hi = hi >> 8
  buf[6] = hi
  hi = hi >> 8
  buf[7] = hi
}

/** write a uint64 (big endian) to the target (fuman writable stream or a buffer) */
export function uint64be(writable: ISyncWritable | Uint8Array, value: bigint, noAssert = false): void {
  const buf = _maybeWrite(writable, 8)
  if (!noAssert) _checkInt(value, 0n, 0xFFFFFFFFFFFFFFFFn)

  let lo = Number(value & 0xFFFFFFFFn)
  buf[7] = lo
  lo = lo >> 8
  buf[6] = lo
  lo = lo >> 8
  buf[5] = lo
  lo = lo >> 8
  buf[4] = lo
  let hi = Number(value >> 32n & 0xFFFFFFFFn)
  buf[3] = hi
  hi = hi >> 8
  buf[2] = hi
  hi = hi >> 8
  buf[1] = hi
  hi = hi >> 8
  buf[0] = hi
}

/** write an int64 (little endian) to the target (fuman writable stream or a buffer) */
export function int64le(writable: ISyncWritable | Uint8Array, value: bigint, noAssert = false): void {
  const buf = _maybeWrite(writable, 8)
  if (!noAssert) _checkInt(value, -0x8000000000000000n, 0x7FFFFFFFFFFFFFFFn)

  let lo = Number(value & 0xFFFFFFFFn)
  buf[0] = lo
  lo = lo >> 8
  buf[1] = lo
  lo = lo >> 8
  buf[2] = lo
  lo = lo >> 8
  buf[3] = lo
  let hi = Number(value >> 32n & 0xFFFFFFFFn)
  buf[4] = hi
  hi = hi >> 8
  buf[5] = hi
  hi = hi >> 8
  buf[6] = hi
  hi = hi >> 8
  buf[7] = hi
}

/** write an int64 (big endian) to the target (fuman writable stream or a buffer) */
export function int64be(writable: ISyncWritable | Uint8Array, value: bigint, noAssert = false): void {
  const buf = _maybeWrite(writable, 8)
  if (!noAssert) _checkInt(value, -0x8000000000000000n, 0x7FFFFFFFFFFFFFFFn)

  let lo = Number(value & 0xFFFFFFFFn)
  buf[7] = lo
  lo = lo >> 8
  buf[6] = lo
  lo = lo >> 8
  buf[5] = lo
  lo = lo >> 8
  buf[4] = lo
  let hi = Number(value >> 32n & 0xFFFFFFFFn)
  buf[3] = hi
  hi = hi >> 8
  buf[2] = hi
  hi = hi >> 8
  buf[1] = hi
  hi = hi >> 8
  buf[0] = hi
}

/** write a variable-size uint (little endian) to the target (fuman writable stream or a buffer) */
export function uintle(writable: ISyncWritable | Uint8Array, size: number, value: bigint, noAssert = false): void {
  if (!noAssert) {
    _checkInt(value, 0n, 2n ** BigInt(8 * size) - 1n)
  }

  const buf = _maybeWrite(writable, size)

  let mul = 1n
  let i = 0
  buf[0] = Number(value & 0xFFn)
  // eslint-disable-next-line no-cond-assign
  while (++i < size && (mul *= 0x100n)) {
    buf[i] = Number((value / mul) & 0xFFn)
  }
}

/** write a variable-size uint (big endian) to the target (fuman writable stream or a buffer) */
export function uintbe(writable: ISyncWritable | Uint8Array, size: number, value: bigint, noAssert = false): void {
  if (!noAssert) {
    _checkInt(value, 0n, 2n ** BigInt(8 * size) - 1n)
  }

  const buf = _maybeWrite(writable, size)

  let i = size - 1
  let mul = 1n
  buf[i] = Number(value & 0xFFn)
  // eslint-disable-next-line no-cond-assign
  while (--i >= 0 && (mul *= 0x100n)) {
    buf[i] = Number((value / mul) & 0xFFn)
  }
}

/** write a variable-size int (little endian) to the target (fuman writable stream or a buffer) */
export function intle(writable: ISyncWritable | Uint8Array, size: number, value: bigint, noAssert = false): void {
  if (!noAssert) {
    const limit = 2n ** BigInt((8 * size) - 1)

    _checkInt(value, -limit, limit - 1n)
  }

  const buf = _maybeWrite(writable, size)

  let i = 0
  let mul = 1n
  let sub = 0n
  buf[0] = Number(value & 0xFFn)
  // eslint-disable-next-line no-cond-assign
  while (++i < size && (mul *= 0x100n)) {
    if (value < 0 && sub === 0n && buf[i - 1] !== 0) {
      sub = 1n
    }
    buf[i] = Number(value / mul - sub & 0xFFn)
  }
}

/** write a variable-size int (big endian) to the target (fuman writable stream or a buffer) */
export function intbe(writable: ISyncWritable | Uint8Array, size: number, value: bigint, noAssert = false): void {
  if (!noAssert) {
    const limit = 2n ** BigInt((8 * size) - 1)

    _checkInt(value, -limit, limit - 1n)
  }

  const buf = _maybeWrite(writable, size)

  let i = size - 1
  let mul = 1n
  let sub = 0n
  buf[i] = Number(value & 0xFFn)
  // eslint-disable-next-line no-cond-assign
  while (--i >= 0 && (mul *= 0x100n)) {
    if (value < 0 && sub === 0n && buf[i + 1] !== 0) {
      sub = 1n
    }
    buf[i] = Number(value / mul - sub & 0xFFn)
  }
}

/** write a float32 (little endian) to the target (fuman writable stream or a buffer) */
export function float32le(writable: ISyncWritable | Uint8Array, value: number): void {
  const buf = _maybeWrite(writable, 4)
  getDv(buf).setFloat32(buf.byteOffset, value, true)
}

/** write a float32 (big endian) to the target (fuman writable stream or a buffer) */
export function float32be(writable: ISyncWritable | Uint8Array, value: number): void {
  const buf = _maybeWrite(writable, 4)
  getDv(buf).setFloat32(buf.byteOffset, value, false)
}

/** write a float64 (little endian) to the target (fuman writable stream or a buffer) */
export function float64le(writable: ISyncWritable | Uint8Array, value: number): void {
  const buf = _maybeWrite(writable, 8)
  getDv(buf).setFloat64(buf.byteOffset, value, true)
}

/** write a float64 (big endian) to the target (fuman writable stream or a buffer) */
export function float64be(writable: ISyncWritable | Uint8Array, value: number): void {
  const buf = _maybeWrite(writable, 8)
  getDv(buf).setFloat64(buf.byteOffset, value, false)
}
