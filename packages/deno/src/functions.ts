import type { ConnectFunction, ListenFunction, TcpEndpoint, TlsConnectOptions } from '@fuman/net'

import { raceWithAbort } from '@fuman/utils'
import { TcpConnection, TlsConnection } from './connection.js'
import { TcpListener } from './listener.js'

export const connectTcp: ConnectFunction<TcpEndpoint, TcpConnection> = async ({ address, port }, signal) => {
  const conn = await raceWithAbort(
    Deno.connect({ port, hostname: address }),
    signal,
    conn => conn.close(),
  )
  return new TcpConnection(conn)
}

export const connectTls: ConnectFunction<TlsConnectOptions, TlsConnection> = async (opts, signal) => {
  if (opts.sni != null) {
    throw new Error('.sni is not available in Deno')
  }

  const conn = await raceWithAbort(
    Deno.connectTls({
      hostname: opts.address,
      port: opts.port,
      caCerts: opts.caCerts,
      alpnProtocols: opts.alpnProtocols,
    }),
    signal,
    conn => conn.close(),
  )

  const onAbort = () => conn.close()
  signal?.addEventListener('abort', onAbort)
  try {
    const handshake = await conn.handshake()
    signal?.throwIfAborted()

    return new TlsConnection(conn, handshake)
  } catch (err) {
    signal?.throwIfAborted()
    throw err
  } finally {
    signal?.removeEventListener('abort', onAbort)
  }
}

export const listenTcp: ListenFunction<TcpEndpoint, TcpListener> = async ({ address, port }) => {
  const listener = Deno.listen({ port, hostname: address, transport: 'tcp' })

  return new TcpListener(listener)
}

// todo: listenTls, upgradeTls
