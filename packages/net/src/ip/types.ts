export interface Ipv4Address {
  type: 'ipv4'
  parts: Uint8Array
}

export interface Ipv6Address {
  type: 'ipv6'
  parts: Uint16Array
  zoneId?: string
}

export type IpAddress = Ipv4Address | Ipv6Address
