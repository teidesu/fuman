export interface PrettifyOptions {
  /**
   * Whether to enclose IPv6 addresses into square brackets
   * (according to [RFC 3986](https://datatracker.ietf.org/doc/html/rfc3986#section-3.2.2))
   *
   * @default false
   */
  encloseIpv6?: boolean
}

export function prettify(address: string, options?: PrettifyOptions): string {
  const {
    encloseIpv6 = false,
  } = options || {}

  const isIpv6 = address.includes(':') // IPv4 address can never have ':', IPv6 always does.

  if (isIpv6) {
    address = `[${address}]` // IPv6 addresses in URLs should be enclosed in []
  }

  // A real protocol like `http` or `ftp` is required,
  // otherwise the host part (i.e., `<ip>(:<port>)?`) will not be parsed correctly.
  const url = new URL(`http://${address}`)

  const prettified = url.hostname

  if (isIpv6 && !encloseIpv6) {
    return prettified.substring(1, prettified.length - 1) // remove [ at left and ] at right
  }

  return prettified
}
