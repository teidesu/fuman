import type { TypedArray } from './types.js'

/**
 * Compare two typed arrays element by element and return -1, 0, or 1,
 * depending on whether the first typed array is less than, equal to, or greater than the second one
 * (similar to the behavior of `String.prototype.localeCompare` for strings)
 */
export function compare<T extends TypedArray>(a: T, b: T): -1 | 0 | 1 {
  if (a.length < b.length) return -1
  if (a.length > b.length) return 1

  for (let i = 0; i < a.length; i++) {
    if (a[i] < b[i]) return -1
    if (a[i] > b[i]) return 1
  }

  return 0
}

/**
 * Check if two typed arrays are equal
 *
 * @param a  First buffer
 * @param b  Second buffer
 */
export function equal<T extends TypedArray>(a: T, b: T): boolean {
  return compare(a, b) === 0
}
