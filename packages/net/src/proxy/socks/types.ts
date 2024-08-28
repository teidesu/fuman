/**
 * Settings for a SOCKS4/5 proxy
 */
export interface SocksProxySettings {
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
     * Version of the SOCKS proxy (4 or 5)
     *
     * @default `5`
     */
    version?: 4 | 5
}

/**
 * An error has occurred while connecting to an SOCKS proxy
 */
export class SocksProxyConnectionError extends Error {
    readonly proxy: SocksProxySettings

    constructor(proxy: SocksProxySettings, message: string) {
        super(`Error while connecting to ${proxy.host}:${proxy.port}: ${message}`)
        this.proxy = proxy
    }
}
