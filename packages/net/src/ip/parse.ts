import type { Ipv4Address, Ipv6Address } from './types.js'
import { parseV4, stringifyV4 } from './v4.js'
import { parseV6, stringifyV6 } from './v6.js'

export function parse(ip: string): Ipv4Address | Ipv6Address {
    if (ip.includes(':')) {
        return parseV6(ip)
    } else {
        return parseV4(ip)
    }
}

export function parseWithPort(ip: string): [Ipv4Address | Ipv6Address, number] {
    const lastColon = ip.lastIndexOf(':')

    const addr = ip.slice(0, lastColon)
    const port = Number(ip.slice(lastColon + 1))

    if (Number.isNaN(port) || port < 0 || port > 65535) {
        throw new Error(`Invalid port: ${ip} (in ${ip})`)
    }

    return [parse(addr), port]
}

export function stringify(parsed: Ipv4Address | Ipv6Address): string {
    if (parsed.type === 'ipv4') {
        return stringifyV4(parsed)
    } else {
        return stringifyV6(parsed)
    }
}

export function stringifyWithPort(parsed: Ipv4Address | Ipv6Address, port: number): string {
    return `${stringify(parsed)}:${port}`
}
