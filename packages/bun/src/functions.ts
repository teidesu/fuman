import type { ConnectFunction, IListener, ListenFunction, TcpEndpoint, TlsConnectOptions } from '@fuman/net'

import { TcpConnection } from './connection.js'
import { TcpListener } from './listener.js'

export const connectTcp: ConnectFunction<TcpEndpoint, TcpConnection> = async (endpoint, signal) => {
  const connection = new TcpConnection()
  await connection.connect(endpoint, signal)
  return connection
}

export const connectTls: ConnectFunction<TlsConnectOptions, TcpConnection> = async (opts, signal) => {
  const connection = new TcpConnection()
  await connection.connectTls(opts, signal)
  return connection
}

export const listenTcp: ListenFunction<TcpEndpoint, IListener<TcpEndpoint>> = async (address) => {
  const listener = new TcpListener()
  listener.listen(address)
  return listener
}

// todo: listenTls, upgradeTls
