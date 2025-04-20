import type { IConnection, TcpEndpoint } from './types.js'
import type { IWebSocketConnectionFramed } from './websocket.js'

/** a connection to a WebSocket server (not to be confused with client-side connection!) */
export interface IWebSocketServerConnection extends IConnection<TcpEndpoint> {
  /** headers from the handshake request */
  readonly headers: Headers
  /** URL of the handshake request */
  readonly url: string
}

/** a framed connection to a WebSocket server (not to be confused with client-side connection!) */
export interface IWebSocketServerConnectionFramed extends IWebSocketConnectionFramed {
  /** headers from the handshake request */
  readonly headers: Headers
  /** URL of the handshake request */
  readonly url: string
}
