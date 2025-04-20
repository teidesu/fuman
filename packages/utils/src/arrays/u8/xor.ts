import { alloc } from './pool.js'

/**
 * Perform XOR operation on two buffers and return the new buffer
 *
 * @param data  Buffer to XOR
 * @param key  Key to XOR with
 */
export function xor(data: Uint8Array, key: Uint8Array): Uint8Array {
  const ret = alloc(data.length)

  for (let i = 0; i < data.length; i++) {
    ret[i] = data[i] ^ key[i]
  }

  return ret
}

/**
 * Perform XOR operation on two buffers in-place
 *
 * @param data  Buffer to XOR
 * @param key  Key to XOR with
 */
export function xorInPlace(data: Uint8Array, key: Uint8Array): void {
  for (let i = 0; i < data.length; i++) {
    data[i] ^= key[i]
  }
}
