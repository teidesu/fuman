/**
 * An error has occurred while connecting to an HTTP(s) proxy
 */
export class HttpProxyConnectionError extends Error {
  readonly proxy: HttpProxySettings

  constructor(proxy: HttpProxySettings, message: string) {
    super(`Error while connecting to ${proxy.host}:${proxy.port}: ${message}`)
    this.proxy = proxy
  }
}

/**
 * HTTP(s) proxy settings
 */
export interface HttpProxySettings {
  /**
   * Host or IP of the proxy (e.g. `proxy.example.com`, `1.2.3.4`)
   */
  host: string

  /**
   * Port of the proxy (e.g. `8888`)
   */
  port: number

  /**
   * Proxy authorization username, if needed
   */
  user?: string

  /**
   * Proxy authorization password, if needed
   */
  password?: string

  /**
   * Proxy connection headers, if needed
   */
  headers?: Record<string, string>
}
