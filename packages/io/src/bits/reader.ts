import type { ISyncReadable } from '../types.js'
import { u8 } from '@fuman/utils'
import { exactly } from '../read/strings.js'

/** a bit reader that reads bits from a byte-aligned stream */
export class BitReader implements ISyncReadable {
  #readable: ISyncReadable
  #currentByte = 0
  #currentBitIdx = 0

  /** @param readable  fuman readable stream */
  constructor(readable: ISyncReadable) {
    this.#readable = readable
  }

  /** Whether the reader is currently aligned on a byte boundary */
  get isAligned(): boolean {
    return this.#currentBitIdx === 0
  }

  /** Skip any remaining bits in the current byte. No-op if already aligned */
  align(): void {
    this.#currentBitIdx = 0
  }

  /** The current bit position within the last consumed byte */
  get bitPosition(): number {
    return this.#currentBitIdx
  }

  readSync(bytes: number): Uint8Array {
    if (this.#currentBitIdx === 0) {
      // aligned read, read the bytes directly
      return this.#readable.readSync(bytes)
    }

    // the idea is to slide by 2 bytes at a time and build the resulting byte from them
    if (bytes === 1) {
      // edge case, we need to read only one byte
      return u8.allocWith([this.readBits(8)])
    }

    const bit = this.#currentBitIdx
    const nbit = 8 - bit
    const mask1 = (1 << nbit) - 1

    const result = u8.alloc(bytes)
    const tmp = this.#readable.readSync(bytes)

    for (let i = 0; i < bytes; i++) {
      const byte1 = this.#currentByte
      const byte2 = tmp[i]

      result[i] = ((byte1 & mask1) << bit) | (byte2 >> nbit)
      this.#currentByte = byte2
    }

    return result
  }

  /** read a number of bits from the stream, and return them as a number */
  readBits(size: number): number {
    let result = 0

    if (this.#currentBitIdx !== 0) {
      // we first need to consume the remaining bits in the current byte
      const bitsLeft = 8 - this.#currentBitIdx

      if (size <= bitsLeft) {
        // we can read the entire size from the current byte
        result = this.#currentByte & ((1 << size) - 1)

        this.#currentBitIdx += size

        if (this.#currentBitIdx === 8) {
          this.#currentBitIdx = 0
        }

        return result
      }

      // we need to read the remaining bits from the current byte
      result = this.#currentByte & ((1 << bitsLeft) - 1)
      size -= bitsLeft
      this.#currentBitIdx = 0
    }

    // how many bytes do we need to read?
    const bytes = Math.ceil(size / 8)

    const data = exactly(this.#readable, bytes)

    // read byte by byte while we can
    let byteIdx = 0
    while (size >= 8) {
      result = (result << 8) | data[byteIdx++]
      size -= 8
    }

    // read the remaining bits
    if (size > 0) {
      this.#currentByte = data[byteIdx]
      this.#currentBitIdx = size

      result = (result << size) | (this.#currentByte >> (8 - size))
    }

    return result
  }

  /** read a number of bits from the stream, and return them as a bigint */
  readBitsBig(size: number): bigint {
    let result = 0n

    if (this.#currentBitIdx !== 0) {
      // we first need to consume the remaining bits in the current byte
      const bitsLeft = 8 - this.#currentBitIdx

      if (size <= bitsLeft) {
        // we can read the entire size from the current byte
        result = BigInt(this.#currentByte) & ((1n << BigInt(size)) - 1n)

        this.#currentBitIdx += Number(size)

        if (this.#currentBitIdx === 8) {
          this.#currentBitIdx = 0
        }

        return result
      }

      // we need to read the remaining bits from the current byte
      result = BigInt(this.#currentByte) & ((1n << BigInt(bitsLeft)) - 1n)
      size -= bitsLeft
      this.#currentBitIdx = 0
    }

    // how many bytes do we need to read?
    const bytes = Math.ceil(size / 8)

    const data = exactly(this.#readable, bytes)
    let sizeBig = BigInt(size)

    // read byte by byte while we can
    let byteIdx = 0
    while (sizeBig >= 8n) {
      result = (result << 8n) | BigInt(data[byteIdx++])
      sizeBig -= 8n
    }

    // read the remaining bits
    if (sizeBig > 0n) {
      this.#currentByte = data[byteIdx]
      this.#currentBitIdx = size

      result = (result << sizeBig) | (BigInt(this.#currentByte) >> (8n - sizeBig))
    }

    return result
  }

  /** skip a number of bits from the stream */
  skipBits(size: number): void {
    if (size % 8 === 0) {
      // we can just skip the bytes
      const buf = exactly(this.#readable, size / 8)
      this.#currentByte = buf[buf.length - 1]

      return
    }

    let bytesToRead = Math.ceil(size / 8)
    if (this.#currentBitIdx !== 0) {
      bytesToRead -= 1 // we already have one byte
    }

    if (bytesToRead > 0) {
      const buf = exactly(this.#readable, bytesToRead)
      this.#currentByte = buf[bytesToRead - 1]
    }

    this.#currentBitIdx = (this.#currentBitIdx + size) % 8
  }
}
