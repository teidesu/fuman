import type { Ipv4Address } from './types.js'
import { u8 } from '@fuman/utils'

export function parseV4(input: string): Ipv4Address {
  const parts = u8.alloc(4)

  const octets = input.split('.')
  const octetsCount = octets.length

  if (octetsCount === 1) {
    // single number, treat as 32-bit integer
    const num = Number(octets[0])
    if (Number.isNaN(num) || num < 0 || num > 4294967295) {
      throw new Error(`Invalid IPv4 address: ${input}`)
    }

    parts[0] = (num >> 24) & 0xFF
    parts[1] = (num >> 16) & 0xFF
    parts[2] = (num >> 8) & 0xFF
    parts[3] = num & 0xFF

    return {
      type: 'ipv4',
      parts,
    }
  }

  if (octetsCount > 4) {
    throw new Error(`Invalid IPv4 address: ${input}`)
  }

  // 1.2 => 1.0.0.2
  // 1.2.3 => 1.2.0.3
  // 1.2.3.4 => 1.2.3.4

  let pos = 0

  for (let i = 0; i < octetsCount; i++) {
    const part = Number(octets[i])

    if (Number.isNaN(part) || part < 0 || part > 255) {
      throw new Error(`Invalid IPv4 address: ${input}`)
    }

    parts[pos] = part

    if (octetsCount === 2 && pos === 0) {
      pos += 2
    } else if (octetsCount === 3 && pos === 1) {
      pos += 1
    }

    pos += 1
  }

  return {
    type: 'ipv4',
    parts,
  }
}

export function stringifyV4(ip: Ipv4Address): string {
  if (ip.parts.length !== 4) {
    throw new Error('Invalid IPv4 address')
  }

  return ip.parts.join('.')
}

export function normalizeV4(input: string): string {
  return stringifyV4(parseV4(input))
}
