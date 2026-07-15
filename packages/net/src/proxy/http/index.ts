import type { ConnectFunction, ITcpConnection, TcpEndpoint } from '../../types.js'

import type { HttpProxySettings } from './types.js'
import { performHttpProxyHandshake } from './connect.js'

export * from './connect.js'
export * from './types.js'

export function withHttpProxy<
  Connection extends ITcpConnection,
  Connect extends ConnectFunction<TcpEndpoint, Connection>,
>(connect: Connect, proxy: HttpProxySettings): Connect {
  return (async (endpoint, signal) => {
    const conn = await connect({
      address: proxy.host,
      port: proxy.port,
    }, signal)

    const onAbort = () => conn.close()
    signal?.addEventListener('abort', onAbort)
    try {
      await performHttpProxyHandshake(conn, conn, proxy, endpoint)
      signal?.throwIfAborted()
    } catch (err) {
      signal?.throwIfAborted()
      throw err
    } finally {
      signal?.removeEventListener('abort', onAbort)
    }

    return conn
  }) as Connect
}
