import type { ConnectFunction, IListener, ListenFunction, TcpEndpoint, TlsConnectOptions } from '@fuman/net'

import { TcpConnection } from './connection.js'
import { TcpListener } from './listener.js'

export const connectTcp: ConnectFunction<TcpEndpoint, TcpConnection> = async (endpoint) => {
  const connection = new TcpConnection()
  await connection.connect(endpoint)
  return connection
}

export const connectTls: ConnectFunction<TlsConnectOptions, TcpConnection> = async (opts) => {
  const connection = new TcpConnection()
  await connection.connectTls(opts)
  return connection
}

export const listenTcp: ListenFunction<TcpEndpoint, IListener<TcpEndpoint>> = async (address) => {
  const listener = new TcpListener()
  listener.listen(address)
  return listener
}

// todo: listenTls, upgradeTls
