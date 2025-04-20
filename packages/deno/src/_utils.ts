import type { TcpEndpoint } from '@fuman/net'

export function addrToTcpEndpoint(addr: Deno.NetAddr): TcpEndpoint {
  const { hostname, port } = addr

  return {
    address: hostname,
    port,
  }
}
