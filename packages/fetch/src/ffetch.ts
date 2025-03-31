import type { UnsafeMutable } from '@fuman/utils'
import type { CombineAddons, FetchLike, FfetchMiddleware } from './_types.js'
import type { FetchAddonCtx, FfetchAddon } from './addons/types.js'
import { composeMiddlewares, unknownToError, utf8 } from '@fuman/utils'

export interface FfetchOptions {
    /**
     * http method
     * @default 'GET'
     */
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'CONNECT' | (string & {})

    /**
     * whether to throw HttpError on non-2xx responses
     *
     * when a function is provided, it will be called with the response
     * and should return whether the response is valid.
     * if it returns false, the response will be thrown as an HttpError
     *
     * @default true
     */
    validateResponse?: false | ((res: Response) => boolean | Promise<boolean>)

    /**
     * whether to read the body of the response on HttpError (i.e. when `validateResponse` returns false).
     * useful for debugging, but may be undesirable in some cases.
     *
     * @default true
     */
    readBodyOnError?: boolean

    /**
     * base url to be prepended to the url
     *
     * this base url is **always** treated as a "base path", i.e. the path passed to `ffetch()`
     * will always be appended to it (unlike the `new URL()`, which has ambiguous slash semantics)
     */
    baseUrl?: string

    /** body to be passed to fetch() */
    body?: BodyInit

    /**
     * shorthand for sending json body.
     * mutually exclusive with `body`
     */
    json?: unknown

    /** headers to be passed to fetch() */
    headers?: HeadersInit

    /** middlewares for the requests */
    middlewares?: FfetchMiddleware[]

    /** any additional options to be passed to fetch() */
    extra?: RequestInit
}

export interface FfetchBaseOptions<Addons extends FfetchAddon<any, any>[] = FfetchAddon<any, any>[]> extends FfetchOptions {
    /** implementation of fetch() */
    fetch?: typeof fetch

    /** addons for the request */
    addons?: Addons

    /**
     * whether to capture stack trace for errors
     * may slightly impact performance
     *
     * @default true
     */
    captureStackTrace?: boolean
}

export interface FfetchResult extends Promise<Response> {
    raw: () => Promise<Response>
    stream: () => Promise<ReadableStream<Uint8Array>>
    json: <T = unknown>() => Promise<T>
    text: () => Promise<string>
    arrayBuffer: () => Promise<ArrayBuffer>
    blob: () => Promise<Blob>
}

const OCTET_STREAM_CONTENT_TYPE = 'application/octet-stream'

/**
 * the main function of the library
 *
 * @param url  url to fetch (or path, if baseUrl is set)
 * @param params  options (note that the function may mutate the object, do not rely on its immutability)
 */
export interface Ffetch<RequestMixin, ResponseMixin> {
    (url: string, params?: FfetchOptions & RequestMixin): FfetchResult & ResponseMixin
    /** shorthand for making a GET request */
    get: (url: string, params?: FfetchOptions & RequestMixin) => FfetchResult & ResponseMixin
    /** shorthand for making a POST request */
    post: (url: string, params?: FfetchOptions & RequestMixin) => FfetchResult & ResponseMixin
    /** shorthand for making a PUT request */
    put: (url: string, params?: FfetchOptions & RequestMixin) => FfetchResult & ResponseMixin
    /** shorthand for making a DELETE request */
    delete: (url: string, params?: FfetchOptions & RequestMixin) => FfetchResult & ResponseMixin
    /** shorthand for making a PATCH request */
    patch: (url: string, params?: FfetchOptions & RequestMixin) => FfetchResult & ResponseMixin
    /** shorthand for making a HEAD request */
    head: (url: string, params?: FfetchOptions & RequestMixin) => FfetchResult & ResponseMixin
    /** shorthand for making an OPTIONS request */
    options: (url: string, params?: FfetchOptions & RequestMixin) => FfetchResult & ResponseMixin

    /**
     * extend the base options with the given options
     *
     * note: addons, middlewares and headers will be merged with the base options,
     * the rest of the options will be overridden
     */
    extend: <
        const Addons extends FfetchAddon<any, any>[],
        Combined extends {
            request: object
            response: object
        } = CombineAddons<Addons>,
    >(
        baseOptions: FfetchBaseOptions<Addons> & RequestMixin & Combined['request']
    ) => Ffetch<RequestMixin & Combined['request'], ResponseMixin & Combined['response']>
}

/**
 * an error that is thrown when the response status is not 2xx,
 * or `validateResponse` returns false
 */
export class HttpError extends Error {
    readonly body: Uint8Array | null = null
    readonly bodyText: string | null = null

    constructor(readonly response: Response) {
        super(`HTTP Error ${response.status} ${response.statusText}`)
    }
}

function headersToObject(headers?: HeadersInit): Record<string, string> {
    if (!headers) return {}
    if (Array.isArray(headers) || headers instanceof Headers) return Object.fromEntries(headers)
    if (Symbol.iterator in headers) {
        // Iterable<string[]>
        return Object.fromEntries(headers as Iterable<string[]>) as Record<string, string>
    }

    return headers
}

class FfetchResultImpl implements FfetchResult {
    #fetch: FetchLike
    private _url: string
    private _init: RequestInit
    private _options: FfetchOptions
    private _headers?: Record<string, string>
    #stack?: string

    constructor(
        fetch: FetchLike,
        url: string,
        init: RequestInit,
        headers: Record<string, string> | undefined,
        options: FfetchOptions,
        stack?: string,
    ) {
        this.#fetch = fetch
        this._init = init
        this._url = url
        this._options = options
        this._headers = headers
        this.#stack = stack
    }

    then<TResult1 = Response, TResult2 = never>(
        onfulfilled?: ((value: Response) => TResult1 | PromiseLike<TResult1>) | undefined | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null,
    ): Promise<TResult1 | TResult2> {
        return this.raw().then(onfulfilled, onrejected)
    }

    catch<TResult = never>(
        onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null,
    ): Promise<Response | TResult> {
        return this.raw().catch(onrejected)
    }

    finally(onfinally?: (() => void) | undefined | null): Promise<Response> {
        return this.raw().finally(onfinally)
    }

    get [Symbol.toStringTag](): string {
        return 'FfetchResult'
    }

    async #fetchAndValidate(): Promise<Response> {
        const res = await this.#fetch(new Request(this._url, this._init))

        let err: HttpError | null = null
        if (this._options.validateResponse === undefined || this._options.validateResponse !== false) {
            if (typeof this._options.validateResponse === 'function') {
                if (!(await this._options.validateResponse(res))) {
                    err = new HttpError(res)
                }
            } else if (!res.ok) {
                err = new HttpError(res)
            }
        }

        if (err != null) {
            if (this._options.readBodyOnError !== false) {
                try {
                    ;(err as UnsafeMutable<HttpError>).body = new Uint8Array(await res.arrayBuffer())
                    // eslint-disable-next-line ts/no-non-null-assertion
                    ;(err as UnsafeMutable<HttpError>).bodyText = utf8.decoder.decode(err.body!)
                } catch {}
            }

            throw err
        }

        return res
    }

    async raw(): Promise<Response> {
        if (this.#stack == null) return this.#fetchAndValidate()

        try {
            return await this.#fetchAndValidate()
        } catch (err_) {
            const err = unknownToError(err_)
            const origMessage = err.message
            const origStack = err.stack

            // eslint-disable-next-line ts/no-non-null-assertion
            const stack = this.#stack!.split('\n').slice(2).join('\n')
            err.stack = `${err.name}: ${err.message}\n${stack}`
            err.cause = { message: origMessage, stack: origStack, cause: err.cause }

            throw err
        }
    }

    async stream(): Promise<ReadableStream<Uint8Array>> {
        const res = await this.raw()
        if (res.body == null) {
            throw new Error('Response body is null')
        }

        return res.body
    }

    async json<T>(): Promise<T> {
        this._headers ??= {}
        this._headers.Accept ??= 'application/json'
        const res = await this.raw()
        return res.json() as Promise<T>
    }

    async text(): Promise<string> {
        const res = await this.raw()
        return res.text()
    }

    async arrayBuffer(): Promise<ArrayBuffer> {
        this._headers ??= {}
        this._headers.Accept ??= OCTET_STREAM_CONTENT_TYPE
        const res = await this.raw()
        return res.arrayBuffer()
    }

    async bytes(): Promise<Uint8Array> {
        return new Uint8Array(await this.arrayBuffer())
    }

    async blob(): Promise<Blob> {
        this._headers ??= {}
        this._headers.Accept ??= OCTET_STREAM_CONTENT_TYPE
        const res = await this.raw()
        return res.blob()
    }
}

function _wrapMethod<T extends Ffetch<any, any>>(method: string, fn: T): T {
    return ((url: string, options: FfetchOptions) => {
        return fn(url, { ...options, method }) as FfetchResult
    }) as T
}

/** create a new ffetch function with the given base options */
export function createFfetch<
    const Addons extends FfetchAddon<any, any>[],
    Combined extends {
        request: object
        response: object
    } = CombineAddons<Addons>,
>(
    baseOptions: FfetchBaseOptions<Addons> & Combined['request'] = {},
): Ffetch<Combined['request'], Combined['response']> {
    const captureStackTrace = baseOptions.captureStackTrace ?? true
    const baseFetch = baseOptions.fetch ?? globalThis.fetch?.bind(globalThis)
    const wrappedFetch: FetchLike = baseOptions.middlewares !== undefined && baseOptions.middlewares.length > 0 ? composeMiddlewares(baseOptions.middlewares, baseFetch) : baseFetch
    const addons = baseOptions.addons ?? []

    let FfetchResultInner
    if (addons.length) {
        FfetchResultInner = class extends FfetchResultImpl {}

        for (let i = 0; i < addons.length; i++) {
            const addon = addons[i]
            for (const key in addon.response) {
                // eslint-disable-next-line ts/no-unsafe-member-access, ts/no-unsafe-assignment
                (FfetchResultInner.prototype as any)[key] = addon.response[key]
            }
        }
    } else {
        FfetchResultInner = FfetchResultImpl
    }

    const fn_ = (url: string, options: FfetchOptions = {}) => {
        let stack: string | undefined
        if (captureStackTrace) {
            // eslint-disable-next-line unicorn/error-message
            stack = new Error().stack
        }

        if (addons.length) {
            const ctx: FetchAddonCtx<any> = { url, options, baseOptions }

            for (let i = 0; i < addons.length; i++) {
                const addon = addons[i]
                addon.beforeRequest?.(ctx)
            }

            url = ctx.url
            options = ctx.options as FfetchOptions
        }

        let fetcher = wrappedFetch
        if (options.middlewares !== undefined && options.middlewares.length > 0) {
            fetcher = composeMiddlewares(options.middlewares, wrappedFetch)
        }

        if ((baseOptions?.baseUrl != null || options.baseUrl != null) && !url.includes('://')) {
            // eslint-disable-next-line ts/no-non-null-assertion
            const baseUrl = (options.baseUrl ?? baseOptions?.baseUrl)!

            let prepend = baseUrl
            if (prepend[prepend.length - 1] !== '/') {
                prepend += '/'
            }
            if (url[0] === '/') {
                url = url.slice(1)
            }
            url = prepend + url
        }

        let init: RequestInit
        let headers: Record<string, string>

        if (baseOptions != null) {
            init = { ...baseOptions.extra, ...options.extra }
            headers = { ...headersToObject(baseOptions.headers), ...headersToObject(options.headers) }
        } else {
            init = options.extra ?? {}
            headers = headersToObject(options.headers)
        }

        if (options.json !== undefined) {
            if (options.body != null) {
                throw new Error('Cannot set both json and body')
            }

            init.body = JSON.stringify(options.json)
            init.method = options.method ?? 'POST'
            headers['Content-Type'] ??= 'application/json'
        } else {
            init.body = options.body
            init.method = options.method ?? baseOptions.method ?? 'GET'

            if (init.body instanceof ReadableStream) {
                // eslint-disable-next-line ts/no-unsafe-member-access
                (init as any).duplex ??= 'half'
            }
        }

        init.headers = headers
        options.validateResponse ??= baseOptions.validateResponse

        return new FfetchResultInner(fetcher, url, init, headers, options, stack)
    }

    const fn = fn_ as unknown as Ffetch<Combined['request'], Combined['response']>
    fn.get = _wrapMethod('GET', fn)
    fn.post = _wrapMethod('POST', fn)
    fn.put = _wrapMethod('PUT', fn)
    fn.delete = _wrapMethod('DELETE', fn)
    fn.patch = _wrapMethod('PATCH', fn)
    fn.head = _wrapMethod('HEAD', fn)
    fn.options = _wrapMethod('OPTIONS', fn)

    fn.extend = (otherOptions: FfetchBaseOptions<any>) => {
        return createFfetch<Addons, Combined>({
            ...baseOptions,
            ...otherOptions,
            addons: [
                ...(baseOptions.addons ?? []),
                // eslint-disable-next-line ts/no-unsafe-assignment
                ...(otherOptions.addons ?? []),
            ],
            middlewares: [
                ...(baseOptions.middlewares ?? []),
                ...(otherOptions.middlewares ?? []),
            ],
            headers: {
                ...baseOptions.headers,
                ...otherOptions.headers,
            },
        })
    }

    return fn
}
