import type { TcpEndpoint } from '../../types.js'
import type { HttpProxySettings } from './types.js'
import { base64, utf8 } from '@fuman/utils'

export function buildConnectRequest(options: HttpProxySettings, dest: TcpEndpoint): Uint8Array {
  let addr = dest.address
  if (addr.includes(':')) {
    addr = `[${addr}]`
  }
  const host = `${addr}:${dest.port}`

  const lines: string[] = [
    `CONNECT ${host} HTTP/1.1`,
    `Host: ${host}`,
    'User-Agent: @fuman/net',
    'Proxy-Connection: Keep-Alive',
  ]

  if (options.user != null) {
    let auth = options.user
    if (options.password != null) {
      auth += `:${options.password}`
    }

    lines.push(`Proxy-Authorization: Basic ${base64.encode(utf8.encoder.encode(auth))}`)
  }

  if (options.headers) {
    for (const [key, value] of Object.entries(options.headers)) {
      lines.push(`${key}: ${value}`)
    }
  }

  lines.push('', '')

  return utf8.encoder.encode(lines.join('\r\n'))
}
