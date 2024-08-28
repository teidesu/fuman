import type { ISyncReadable, ISyncWritable } from '@fuman/io'

import type { Ipv6Address } from './types.js'
import { read } from '@fuman/io'
import { typed, u8 } from '@fuman/utils'

const IPV6_PARTS = 8

/* Parse an IPv6 address into parts and zone ID. */
export function parseV6(string: string): Ipv6Address {
    const parts = new Uint16Array(8)

    let parsedParts = 0
    let afterDoubleColon: number[] | undefined
    let zoneId: string | undefined
    let currentPartStart = 0
    let ipv4Part = false
    let hadSquareBracket = false
    let pos = 0

    function addPart(str: string, part: number) {
        if (str.length > 4 || Number.isNaN(part) || part < 0 || part > 0xFFFF) {
            throw new Error(`Invalid IPv6 part: ${str} (in ${string})`)
        }

        if (afterDoubleColon) {
            afterDoubleColon.push(part)
        } else {
            parts[parsedParts] = part
            parsedParts += 1

            if (parsedParts > IPV6_PARTS) {
                throw new Error(`Invalid IPv6 address (too many parts): ${string}`)
            }
        }
    }

    function handleCurrentPart() {
        if (currentPartStart === pos) return

        const str = string.slice(currentPartStart, pos)

        if (ipv4Part) {
            // not the most efficient way,
            // but handling it within the same loop is more complex
            // and might lead to performance issues in the more common
            // case (which is parsing pure IPv6 addresses)
            const ipv4 = str.split('.')
            if (ipv4.length !== 4) {
                throw new Error(`Invalid IPv4 part: ${str} (in ${string})`)
            }

            addPart('', Number.parseInt(ipv4[0], 10) << 8 | Number.parseInt(ipv4[1], 10))
            addPart('', Number.parseInt(ipv4[2], 10) << 8 | Number.parseInt(ipv4[3], 10))

            return
        }

        const part = Number.parseInt(str, 16)

        addPart(str, part)
    }

    while (pos < string.length) {
        const c = string[pos]

        if (c === '%') {
            handleCurrentPart()
            pos += 1

            // the rest of the string is the zone ID
            zoneId = string.slice(pos)
            if (zoneId[zoneId.length - 1] === ']') {
                zoneId = zoneId.slice(0, -1)
            }

            break
        } else if (c === '[') {
            hadSquareBracket = true
            currentPartStart = pos + 1
        } else if (c === ']') {
            if (!hadSquareBracket || (
                pos !== string.length - 1
                && string[pos + 1] !== '%'
            )) {
                throw new Error(`Invalid IPv6 address (unexpected closing bracket): ${string}`)
            }

            handleCurrentPart()
            currentPartStart = pos + 1
        } else if (c === ':') {
            if (ipv4Part) {
                throw new Error(`Invalid IPv6 address (colon after IPv4 part): ${string}`)
            }

            if (pos !== 0) {
                // if pos == 0 then : is at the very beginning of the string
                handleCurrentPart()
            }

            // is this a double colon?
            if (string[pos + 1] === ':') {
                if (afterDoubleColon) {
                    throw new Error(`Invalid IPv6 address (multiple double-colons): ${string}`)
                }

                afterDoubleColon = []
                pos += 1
            } else if (pos === 0) {
                // `:` at the beginning of the string
                throw new Error(`Invalid IPv6 address (colon at the beginning): ${string}`)
            }

            currentPartStart = pos + 1
        } else if (c === '.') {
            // embedded IPv4 address?
            ipv4Part = true
        }

        pos += 1
    }

    // we might have a part after the last colon
    if (!hadSquareBracket && zoneId === undefined) {
        handleCurrentPart()
    }

    if (afterDoubleColon) {
        // we had a double colon, fill in the missing parts
        const missing = IPV6_PARTS - parsedParts - afterDoubleColon.length

        if (missing < 0) {
            throw new Error(`Invalid IPv6 address (too many parts): ${string}`)
        }

        for (let i = 0; i < missing; i++) {
            parts[parsedParts + i] = 0
        }

        for (let i = 0; i < afterDoubleColon.length; i++) {
            parts[parsedParts + missing + i] = afterDoubleColon[i]
        }
    } else if (parsedParts < IPV6_PARTS) {
        throw new Error(`Invalid IPv6 address (too few parts): ${string}`)
    }

    return {
        type: 'ipv6',
        parts,
        zoneId,
    }
}

export interface StringifyV6Options {
    /**
     * Whether to compress consecutive zeroes
     * (according to [RFC 5952](https://datatracker.ietf.org/doc/html/rfc5952#section-4))
     */
    zeroCompression?: boolean
    /** Whether to pad each part to 4 characters */
    fixedLength?: boolean
}

export function stringifyV6(parsed: Ipv6Address, options?: StringifyV6Options): string {
    const {
        zeroCompression = true,
        fixedLength = false,
    } = options || {}

    let result = ''

    let compressStart = -1
    let compressEnd = 0

    if (zeroCompression) {
        // Find the longest run of zeroes
        let maxLength = 0
        let maxStart = -1
        let start = -1
        let length = 0

        for (let i = 0; i < parsed.parts.length; i++) {
            if (parsed.parts[i] === 0) {
                if (start === -1) {
                    start = i
                }

                length++
            } else {
                if (length > maxLength) {
                    maxLength = length
                    maxStart = start
                }

                start = -1
                length = 0
            }
        }

        if (length > maxLength) {
            maxLength = length
            maxStart = start
        }

        if (maxLength > 1) {
            compressStart = maxStart
            compressEnd = maxStart + maxLength
        }
    }

    let i = 0
    let writeColon = false

    while (i < parsed.parts.length) {
        const part = parsed.parts[i]
        if (part < 0 || part > 0xFFFF) {
            throw new Error(`Invalid IPv6 part: ${part.toString(16)}`)
        }

        if (i === compressStart) {
            result += '::'
            i = compressEnd
            writeColon = false
            continue
        }

        if (writeColon) result += ':'
        else writeColon = true

        if (fixedLength) {
            if (part < 0x10) result += '000'
            else if (part < 0x100) result += '00'
            else if (part < 0x1000) result += '0'
        }

        result += part.toString(16)

        i += 1
    }

    if (parsed.zoneId != null) {
        result += `%${parsed.zoneId}`
    }

    return result
}

export function expandV6(string: string): string {
    return stringifyV6(parseV6(string), { zeroCompression: false })
}

function _fromBytesInternal(bytes: Uint8Array): Ipv6Address {
    const parts = new Uint16Array(bytes.buffer, bytes.byteOffset, 8)

    if (typed.getPlatformByteOrder() === 'little') {
        u8.swap16(bytes)
    }

    return {
        type: 'ipv6',
        parts,
    }
}

export function fromBytesV6(bytes: Uint8Array): Ipv6Address {
    if (bytes.length !== 16) {
        throw new Error(`Invalid IPv6 address buffer: ${bytes.length} ≠ 16`)
    }

    return _fromBytesInternal(u8.clone(bytes))
}

export function readV6(reader: ISyncReadable): Ipv6Address {
    return _fromBytesInternal(read.exactly(reader, 16))
}

export function toBytesV6(parsed: Ipv6Address): Uint8Array {
    const copy = new Uint16Array(parsed.parts)
    const bytes = new Uint8Array(copy.buffer)

    if (typed.getPlatformByteOrder() === 'little') {
        u8.swap16(bytes)
    }

    return bytes
}

export function writeV6(parsed: Ipv6Address, writer: ISyncWritable): void {
    const buf = writer.writeSync(16)

    buf.set(new Uint8Array(parsed.parts.buffer, parsed.parts.byteOffset, 16))

    if (typed.getPlatformByteOrder() === 'little') {
        u8.swap16(buf)
    }

    writer.disposeWriteSync()
}
