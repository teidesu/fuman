import { describe, expect, it } from 'vitest'

import { abs, bitLength, euclideanGcd, max, max2, min, min2, modInv, modPowBinary, twoMultiplicity } from './math.js'

describe('bitLength', () => {
  it('should correctly calculate bit length', () => {
    expect(bitLength(0n)).eq(0)
    expect(bitLength(1n)).eq(1)
    expect(bitLength(2n)).eq(2)
    expect(bitLength(255n)).eq(8)
    expect(bitLength(256n)).eq(9)
  })
})

describe('euclideanGcd', () => {
  it('should return the greatest common divisor of a and b', () => {
    expect(euclideanGcd(123n, 456n)).toEqual(3n)
  })

  it('should correctly handle zeros', () => {
    expect(euclideanGcd(0n, 0n)).toEqual(0n)
    expect(euclideanGcd(0n, 1n)).toEqual(1n)
    expect(euclideanGcd(1n, 0n)).toEqual(1n)
  })

  it('should correctly handle equal values', () => {
    expect(euclideanGcd(1n, 1n)).toEqual(1n)
  })
})

describe('modPowBinary', () => {
  it('should correctly calculate modular exponentiation', () => {
    expect(modPowBinary(2n, 3n, 5n)).toEqual(3n)
    expect(modPowBinary(2n, 3n, 6n)).toEqual(2n)
    expect(modPowBinary(2n, 3n, 7n)).toEqual(1n)
    expect(modPowBinary(2n, 3n, 8n)).toEqual(0n)
  })

  it('should correctly handle very large numbers', () => {
    // calculating this directly would either take forever or error with "Maximum BigInt size exceeded
    expect(modPowBinary(2n, 100000000000n, 100n)).toEqual(76n)
  })
})

describe('twoMultiplicity', () => {
  it('should return the multiplicity of 2 in the prime factorization of n', () => {
    expect(twoMultiplicity(0n)).toEqual(0n)
    expect(twoMultiplicity(1n)).toEqual(0n)
    expect(twoMultiplicity(2n)).toEqual(1n)
    expect(twoMultiplicity(4n)).toEqual(2n)
    expect(twoMultiplicity(65536n)).toEqual(16n)
    expect(twoMultiplicity(65537n)).toEqual(0n)
  })
})

describe('modInv', () => {
  it('should correctly calculate modular inverse', () => {
    expect(modInv(2n, 5n)).toEqual(3n)
    expect(modInv(2n, 7n)).toEqual(4n)
  })

  it("should error if there's no modular inverse", () => {
    expect(() => modInv(2n, 6n)).toThrow(RangeError)
    expect(() => modInv(2n, 8n)).toThrow(RangeError)
  })

  it('should correctly handle very large numbers', () => {
    // calculating this with BigInt would either take forever or error with "Maximum BigInt size exceeded
    expect(modInv(123123123123n, 1829n)).toEqual(318n)
  })
})

describe('min2', () => {
  it('should return the smaller of two numbers', () => {
    expect(min2(1n, 2n)).toBe(1n)
    expect(min2(2n, 1n)).toBe(1n)
    expect(min2(1n, 1n)).toBe(1n)
  })
})

describe('min', () => {
  it('should return the smallest of multiple numbers', () => {
    expect(min(1n, 2n, 3n)).toBe(1n)
    expect(min(2n, 1n, 3n)).toBe(1n)
    expect(min(1n, 3n, 2n)).toBe(1n)
  })
})

describe('max2', () => {
  it('should return the larger of two numbers', () => {
    expect(max2(1n, 2n)).toBe(2n)
    expect(max2(2n, 1n)).toBe(2n)
    expect(max2(1n, 1n)).toBe(1n)
  })
})

describe('max', () => {
  it('should return the largest of multiple numbers', () => {
    expect(max(1n, 2n, 3n)).toBe(3n)
    expect(max(2n, 1n, 3n)).toBe(3n)
    expect(max(1n, 3n, 2n)).toBe(3n)
  })
})

describe('abs', () => {
  it('should return the absolute value of a number', () => {
    expect(abs(-1n)).toBe(1n)
    expect(abs(1n)).toBe(1n)
  })
})
