import type {
  ConnectFunction,
  ListenFunction,
  TcpEndpoint,
  TlsConnectOptions,
  TlsListenOptions,
  TlsOptions,
  TlsUpgradeFunction,
} from '@fuman/net'
import type { ConnectionOptions, SecureContext, SecureContextOptions, TlsOptions as TlsServerOptions } from 'node:tls'

import { Server, Socket } from 'node:net'
import { createSecureContext, connect as nodeTlsConnect, createServer as tlsCreateServer } from 'node:tls'

import { TcpConnection, TlsConnection } from './connection.js'
import { TcpListener, TlsListener } from './listener.js'

function awaitConnect(socket: Socket) {
  return new Promise<void>((resolve, reject) => {
    socket.on('error', reject)
    socket.once('connect', () => {
      socket.off('error', reject)
      resolve()
    })
  })
}

export const connectTcp: ConnectFunction<TcpEndpoint, TcpConnection> = async ({ address, port }) => {
  const socket = new Socket()
  socket.connect(port, address)
  await awaitConnect(socket)

  return new TcpConnection(socket)
}

export interface NodeTlsConnectOptions extends TlsConnectOptions {
  extraOptions?: ConnectionOptions
}

export const connectTls: ConnectFunction<NodeTlsConnectOptions, TlsConnection> = async (options) => {
  const { address, port, sni, caCerts, alpnProtocols, extraOptions } = options

  const socket = nodeTlsConnect({
    host: address,
    port,
    ca: caCerts,
    ALPNProtocols: alpnProtocols,
    servername: sni,
    ...extraOptions,
  })

  await awaitConnect(socket)

  return new TlsConnection(socket)
}

export const listenTcp: ListenFunction<TcpEndpoint, TcpListener> = async ({ address, port }) => {
  return new Promise((resolve, reject) => {
    const server = new Server()
    server.on('error', reject)

    server.listen(port, address, () => {
      server.off('error', reject)

      resolve(new TcpListener(server))
    })
  })
}

export interface NodeTlsUpgradeOptions extends TlsOptions {
  extraOptions?: ConnectionOptions
}

export const upgradeTls: TlsUpgradeFunction<NodeTlsUpgradeOptions, TcpConnection, TlsConnection> = async (conn, options) => {
  return new Promise((resolve, reject) => {
    const onError = (error: Error) => {
      reject(error)
      conn.close()
    }

    const tlsSocket = nodeTlsConnect({
      socket: conn.socket,
      ca: options.caCerts,
      ALPNProtocols: options.alpnProtocols,
      servername: options.sni,
      ...options.extraOptions,
    }, () => {
      tlsSocket.off('error', onError)
      resolve(new TlsConnection(tlsSocket))
    })

    tlsSocket.on('error', onError)
  })
}

export interface NodeTlsListenOptions extends TlsListenOptions {
  extraOptions?: SecureContextOptions
}

function hostToSecureContextOptions(host: NonNullable<NodeTlsListenOptions['hosts']>[0]): SecureContextOptions {
  const { key, cert, caCerts, extraOptions } = host

  return {
    key,
    cert,
    ca: caCerts,
    ...extraOptions,
  }
}

export const listenTls: ListenFunction<TlsListenOptions, TlsListener> = async (options) => {
  const hosts = options.hosts ?? [options]

  let listenOptions: TlsServerOptions
  if (hosts.length === 1) {
    listenOptions = {
      ALPNProtocols: options.alpnProtocols,
      ...hostToSecureContextOptions(hosts[0]),
    }
  } else {
    const secureContexts = new Map<string, SecureContext>()
    for (const host of hosts) {
      if (host.sni == null) throw new Error('SNI is required for multi-host setups')
      secureContexts.set(host.sni, createSecureContext(hostToSecureContextOptions(host)))
    }

    listenOptions = {
      ALPNProtocols: options.alpnProtocols,
      SNICallback: (hostname, cb) => {
        const ctx = secureContexts.get(hostname)
        if (ctx) {
          cb(null, ctx)
          return
        }

        cb(new Error('No matching host found'))
      },
    }
  }

  const socket = tlsCreateServer(listenOptions)

  socket.listen(options.port, options.address)

  return new TlsListener(socket)
}
