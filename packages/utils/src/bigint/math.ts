/**
 * Get the minimum number of bits required to represent the number
 */
export function bitLength(n: bigint): number {
  if (n === 0n) return 0

  // not the fastest way, but at least not .toString(2) and not too complex
  // taken from: https://stackoverflow.com/a/76616288/22656950

  const i = (n.toString(16).length - 1) * 4

  return i + 32 - Math.clz32(Number(n >> BigInt(i)))
}

/**
 * Compute the multiplicity of 2 in the prime factorization of n
 * @param n
 */
export function twoMultiplicity(n: bigint): bigint {
  if (n === 0n) return 0n

  let m = 0n
  let pow = 1n

  while (true) {
    if ((n & pow) !== 0n) return m
    m += 1n
    pow <<= 1n
  }
}

export function min2(a: bigint, b: bigint): bigint {
  return a < b ? a : b
}

export function min(...args: bigint[]): bigint {
  let m = args[0]
  for (let i = 1; i < args.length; i++) {
    if (args[i] < m) m = args[i]
  }
  return m
}

export function max2(a: bigint, b: bigint): bigint {
  return a > b ? a : b
}

export function max(...args: bigint[]): bigint {
  let m = args[0]
  for (let i = 1; i < args.length; i++) {
    if (args[i] > m) m = args[i]
  }
  return m
}

export function abs(a: bigint): bigint {
  return a < 0n ? -a : a
}

export function euclideanGcd(a: bigint, b: bigint): bigint {
  while (b !== 0n) {
    const t = b
    b = a % b
    a = t
  }

  return a
}

export function modPowBinary(base: bigint, exp: bigint, mod: bigint): bigint {
  // https://en.wikipedia.org/wiki/Modular_exponentiation#Right-to-left_binary_method

  base %= mod

  let result = 1n

  while (exp > 0n) {
    if (exp % 2n === 1n) {
      result = (result * base) % mod
    }

    exp >>= 1n
    base = base ** 2n % mod
  }

  return result
}

// below code is based on https://github.com/juanelas/bigint-mod-arith, MIT license
// maybe vendor it entirely?

function eGcd(a: bigint, b: bigint): [bigint, bigint, bigint] {
  let x = 0n
  let y = 1n
  let u = 1n
  let v = 0n

  while (a !== 0n) {
    const q = b / a
    const r: bigint = b % a
    const m = x - u * q
    const n = y - v * q
    b = a
    a = r
    x = u
    y = v
    u = m
    v = n
  }

  return [b, x, y]
}

function toZn(a: number | bigint, n: number | bigint): bigint {
  if (typeof a === 'number') a = BigInt(a)
  if (typeof n === 'number') n = BigInt(n)

  if (n <= 0n) {
    throw new RangeError('n must be > 0')
  }

  const aZn = a % n

  return aZn < 0n ? aZn + n : aZn
}

export function modInv(a: bigint, n: bigint): bigint {
  const [g, x] = eGcd(toZn(a, n), n)

  if (g !== 1n) {
    throw new RangeError(`${a.toString()} does not have inverse modulo ${n.toString()}`)
  } else {
    return toZn(x, n)
  }
}
