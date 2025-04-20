import type { ConnectFunction, ITcpConnection, TcpEndpoint } from '../../types.js'

import type { SocksProxySettings } from './types.js'
import { performSocksHandshake } from './connect.js'

export * from './connect.js'
export * from './types.js'

export function withSocksProxy<
  Connection extends ITcpConnection,
  Connect extends ConnectFunction<TcpEndpoint, Connection>,
>(connect: Connect, proxy: SocksProxySettings): Connect {
  return (async (endpoint) => {
    const conn = await connect({
      address: proxy.host,
      port: proxy.port,
    })

    await performSocksHandshake(conn, conn, proxy, endpoint)

    return conn
  }) as Connect
}
