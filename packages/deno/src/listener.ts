import type { IListener, TcpEndpoint } from '@fuman/net'
import { ListenerClosedError } from '@fuman/net'

import { addrToTcpEndpoint } from './_utils.js'
import { TcpConnection } from './connection.js'

export class TcpListener implements IListener<TcpEndpoint, TcpConnection> {
  constructor(readonly listener: Deno.TcpListener) {}

  get address(): TcpEndpoint {
    return addrToTcpEndpoint(this.listener.addr)
  }

  async accept(): Promise<TcpConnection> {
    try {
      const conn = await this.listener.accept()

      return new TcpConnection(conn)
    } catch (err) {
      if (err instanceof Deno.errors.BadResource || err instanceof Deno.errors.Interrupted) {
        throw new ListenerClosedError()
      } else {
        throw err
      }
    }
  }

  close(): void {
    this.listener.close()
  }
}
