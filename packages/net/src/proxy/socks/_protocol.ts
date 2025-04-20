import type { TcpEndpoint } from '../../types.js'
import { Bytes, write } from '@fuman/io'

import { u8, utf8 } from '@fuman/utils'
import { ip } from '../../ip/index.js'

export const SOCKS4_ERRORS: Record<number, string> = {
  91: 'Request rejected or failed',
  92: 'Request failed because client is not running identd',
  93: "Request failed because client's identd could not confirm the user ID in the request",
}

export const SOCKS5_ERRORS: Record<number, string> = {
  1: 'General failure',
  2: 'Connection not allowed by ruleset',
  3: 'Network unreachable',
  4: 'Host unreachable',
  5: 'Connection refused by destination host',
  6: 'TTL expired',
  7: 'Command not supported / protocol error',
  8: 'Address type not supported',
}

export function buildSocks4Connect(dest: TcpEndpoint, username = ''): Uint8Array {
  let addr
  try {
    addr = ip.parse(dest.address)
  } catch {}
  let isHostname = false
  if (!addr) {
    // hostname will be resolved through the proxy (socks4a)
    isHostname = true
    // The client should set the first three bytes of DSTIP to NULL and the last byte to a non-zero value.
    addr = { type: 'ipv4', parts: u8.allocWith([0, 0, 0, 42]) }
  } else if (addr.type !== 'ipv4') {
    throw new TypeError('SOCKS4 only supports IPv4')
  }

  const hostnameLength = isHostname ? (utf8.encodedLength(dest.address) + 1) : 0
  const userIdLength = utf8.encodedLength(username)

  const buf = Bytes.alloc(8 + userIdLength + hostnameLength)

  write.uint8(buf, 0x04) // VER
  write.uint8(buf, 0x01) // CMD = establish a TCP/IP stream connection
  write.uint16be(buf, dest.port)
  write.bytes(buf, addr.parts)
  write.cUtf8String(buf, username)

  if (isHostname) {
    write.cUtf8String(buf, dest.address)
  }

  return buf.result()
}

export function buildSocks5Greeting(authAvailable: boolean): Uint8Array {
  const buf = u8.alloc(authAvailable ? 4 : 3)

  buf[0] = 0x05 // VER

  if (authAvailable) {
    buf[1] = 0x02 // NAUTH
    buf[2] = 0x00 // AUTH[0] = No authentication
    buf[3] = 0x02 // AUTH[1] = Username/password
  } else {
    buf[1] = 0x01 // NAUTH
    buf[2] = 0x00 // AUTH[0] = No authentication
  }

  return buf
}

export function buildSocks5Auth(username: string, password: string): Uint8Array {
  const usernameLen = utf8.encodedLength(username)
  const passwordLen = utf8.encodedLength(password)

  if (usernameLen > 255) {
    throw new TypeError(`Too long username (${usernameLen} > 255)`)
  }
  if (passwordLen > 255) {
    throw new TypeError(`Too long password (${passwordLen} > 255)`)
  }

  const buf = u8.alloc(3 + usernameLen + passwordLen)
  buf[0] = 0x01 // VER of auth
  buf[1] = usernameLen
  utf8.encoder.encodeInto(username, buf.subarray(2))
  buf[2 + usernameLen] = passwordLen
  utf8.encoder.encodeInto(password, buf.subarray(3 + usernameLen))

  return buf
}

export function buildSocks5Connect(dest: TcpEndpoint): Uint8Array {
  let addr
  try {
    addr = ip.parse(dest.address)
  } catch {}

  const buf = Bytes.alloc(32)

  write.uint8(buf, 0x05) // VER
  write.uint8(buf, 0x01) // CMD = establish a TCP/IP stream connection
  write.uint8(buf, 0x00) // RSV

  if (!addr) {
    // hostname will be resolved through the proxy (socks5)
    const addrLen = utf8.encodedLength(dest.address)
    if (addrLen > 255) {
      throw new TypeError(`Too long hostname (${addrLen} > 255)`)
    }

    write.uint8(buf, 0x03) // TYPE = domain name
    write.uint8(buf, addrLen) // ADDR (length)
    write.utf8String(buf, dest.address) // ADDR
  } else if (addr.type === 'ipv6') {
    write.uint8(buf, 0x04) // TYPE = IPv6
    ip.writeV6(addr, buf)
  } else {
    write.uint8(buf, 0x01) // TYPE = IPv4
    write.bytes(buf, addr.parts)
  }

  write.uint16be(buf, dest.port)

  return buf.result()
}
