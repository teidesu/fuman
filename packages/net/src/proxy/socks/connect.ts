import type { IReadable, IWritable } from '@fuman/io'

import type { TcpEndpoint } from '../../types.js'
import { read } from '@fuman/io'

import { buildSocks4Connect, buildSocks5Auth, buildSocks5Connect, buildSocks5Greeting, SOCKS4_ERRORS, SOCKS5_ERRORS } from './_protocol.js'
import { SocksProxyConnectionError, type SocksProxySettings } from './types.js'

async function connectV4(
    reader: IReadable,
    writer: IWritable,
    proxy: SocksProxySettings,
    destination: TcpEndpoint,
): Promise<void> {
    await writer.write(buildSocks4Connect(destination, proxy.user))

    const response = await read.async.exactly(reader, 8)

    if (response[0] !== 0x00) {
        throw new SocksProxyConnectionError(proxy, `Unexpected response first byte: ${response[0]}`)
    }

    if (response[1] !== 0x5A) {
        const code = response[1]
        throw new SocksProxyConnectionError(proxy, code in SOCKS4_ERRORS ? SOCKS4_ERRORS[code] : `Unknown error code: ${code}`)
    }
}

async function connectV5(
    reader: IReadable,
    writer: IWritable,
    proxy: SocksProxySettings,
    destination: TcpEndpoint,
): Promise<void> {
    await writer.write(buildSocks5Greeting(proxy.user != null))

    const greetingRes = await read.async.exactly(reader, 2)
    if (greetingRes[0] !== 0x05) {
        throw new SocksProxyConnectionError(proxy, `Unexpected response first byte: ${greetingRes[0]}`)
    }

    if (greetingRes[1] !== 0x00) { // 0 = "No authentication"
        if (greetingRes[1] === 0x02) {
            // 2 = "Username/password"
            if (proxy.user == null || proxy.password == null) {
                throw new SocksProxyConnectionError(proxy, 'Authentication is required, but not provided')
            }

            await writer.write(buildSocks5Auth(proxy.user, proxy.password))

            const authRes = await read.async.exactly(reader, 2)

            if (authRes[0] !== 0x01) {
                throw new SocksProxyConnectionError(proxy, `Invalid SOCKS auth version: ${authRes[0]}`)
            }

            if (authRes[1] !== 0x00) {
                throw new SocksProxyConnectionError(proxy, `Unexpected SOCKS auth response, invalid auth? Code: ${authRes[1]}`)
            }
        } else {
            throw new SocksProxyConnectionError(proxy, `Unsupported authentication method: ${greetingRes[1]}`)
        }
    }

    await writer.write(buildSocks5Connect(destination))

    const response = await read.async.exactly(reader, 4)

    if (response[0] !== 0x05) {
        throw new SocksProxyConnectionError(proxy, `Unexpected response first byte: ${response[0]}`)
    }

    if (response[1] !== 0x00) {
        const code = response[1]
        throw new SocksProxyConnectionError(proxy, code in SOCKS5_ERRORS ? SOCKS5_ERRORS[code] : `Unknown error code: ${code}`)
    }

    // response[2] is RSV

    // skip BNDADDR and BNDPORT
    switch (response[3]) {
        case 0x00: {
            // no BNDADDR, just BNDPORT
            await read.async.exactly(reader, 2)
            break
        }
        case 0x01: {
            // BNDADDR is IPv4, 6 bytes total
            await read.async.exactly(reader, 6)
            break
        }
        case 0x04: {
            // BNDADDR is IPv6, 18 bytes total
            await read.async.exactly(reader, 18)
            break
        }
        default:
            throw new SocksProxyConnectionError(proxy, `Invalid BNDADDR type: ${response[3]}`)
    }
}

export async function performSocksHandshake(
    reader: IReadable,
    writer: IWritable,
    proxy: SocksProxySettings,
    destination: TcpEndpoint,
): Promise<void> {
    if (proxy.version != null && proxy.version !== 4 && proxy.version !== 5) {
        throw new SocksProxyConnectionError(
            proxy,
            `Invalid SOCKS version: ${proxy.version as string}`,
        )
    }

    if (proxy.version === 4) {
        return connectV4(reader, writer, proxy, destination)
    }

    return connectV5(reader, writer, proxy, destination)
}
