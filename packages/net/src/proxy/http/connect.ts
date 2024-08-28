import type { TcpEndpoint } from '../../types.js'
import { type IReadable, type IWritable, read } from '@fuman/io'

import { typed, u8, utf8 } from '@fuman/utils'

import { buildConnectRequest } from './_protocol.js'
import { HttpProxyConnectionError, type HttpProxySettings } from './types.js'

const HTTP1_1_OK = /* #__PURE__ */ utf8.encoder.encode('HTTP/1.1 200')
const CR = /* #__PURE__ */ '\r'.charCodeAt(0)
const LF = /* #__PURE__ */ '\n'.charCodeAt(0)

export async function performHttpProxyHandshake(
    reader: IReadable,
    writer: IWritable,
    proxy: HttpProxySettings,
    destination: TcpEndpoint,
): Promise<void> {
    await writer.write(buildConnectRequest(proxy, destination))

    // minimum valid response is "HTTP/1.1 200\r\n\r\n"
    // we can safely read 12 bytes at first, validate them
    // and then read by 4 bytes at a time until we find \r\n\r\n
    const res1 = await read.async.exactly(reader, 12)

    if (!typed.equal(res1, HTTP1_1_OK)) {
        throw new HttpProxyConnectionError(
            proxy,
            `Invalid HTTP response: ${utf8.decoder.decode(res1)}`,
        )
    }

    const buf = u8.alloc(4)
    while (true) {
        await read.async.exactly(reader, buf)

        const idx = typed.indexOf(buf, CR)
        if (idx !== -1) {
            if (idx > 0) {
                buf.copyWithin(0, idx)
                await read.async.exactly(reader, buf.subarray(4 - idx))
            }

            if (buf[0] === CR && buf[1] === LF && buf[2] === CR && buf[3] === LF) {
                break
            }
        }
    }
}
