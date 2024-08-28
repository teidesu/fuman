import type { UnsafeMutable } from '../types/misc.js'
import { asNonNull } from '../misc/assert.js'

import { Deferred } from './deferred.js'
import { Emitter } from './emitter.js'
import * as timers from './timers.js'

export interface AsyncResourceContext<T> {
    /** currently cached value of the resource */
    readonly current: T | null
    /** performance.now() when the resource was fetched */
    readonly currentFetchedAt: number
    /** performance.now() when the resource will/did expire */
    readonly currentExpiresAt: number
    /**
     * whether the current fetch was initiated in the background
     * (by the swr mechanism or because of auto-reload).
     * this can be used to prioritize the fetch if needed
     */
    readonly isBackground: boolean
    /** abort signal that should be used to abort the fetch */
    readonly abort: AbortSignal
}

export interface AsyncResourceOptions<T> {
    /**
     * if true, the resource will be automatically
     * reloaded after {@link autoReloadAfter} milliseconds
     * once the resource is expires
     *
     * (note that it will need to be fetched manually at least once)
     */
    autoReload?: boolean

    /**
     * time in milliseconds after which the resource will be reloaded
     * after expiring if {@link autoReload} is true.
     * can be negative to reload before expiring
     *
     * @default  0 (i.e. as soon as it expires)
     */
    autoReloadAfter?: number

    /**
     * if true, the resource will keep returning expired data
     * after it expires while the resource is being reloaded
     */
    swr?: boolean

    /**
     * if {@link swr} is true, this function will be called
     * to validate if the cached data is still valid
     */
    swrValidator?: (ctx: AsyncResourceContext<T>) => boolean

    /**
     * function that will be called to fetch the resource
     *
     * @returns  Promise that resolves to the resource and the number of milliseconds before it expires
     */
    fetcher: (ctx: AsyncResourceContext<T>) => Promise<{
        data: T
        expiresIn: number
    }>

    /**
     * function that will be called if {@link fetcher} throws an error
     *
     * @param err  error thrown by {@link fetcher}
     * @default `console.error(err)`
     */
    onError?: (err: unknown, ctx: AsyncResourceContext<T>) => void
}

export class AsyncResource<T> {
    #abort?: AbortController
    #ctx: UnsafeMutable<AsyncResourceContext<T>>

    #updating?: Deferred<void>
    #timeout?: timers.Timer

    readonly onUpdated: Emitter<AsyncResourceContext<T>> = new Emitter()

    constructor(readonly params: AsyncResourceOptions<T>) {
        this.#ctx = {
            current: null,
            currentFetchedAt: 0,
            currentExpiresAt: 0,
            isBackground: false,
            // eslint-disable-next-line ts/no-non-null-assertion
            abort: null!,
        }
    }

    get isStale(): boolean {
        return this.#ctx.current === null || this.#ctx.currentExpiresAt <= performance.now()
    }

    setData(data: T, expiresIn: number): void {
        const now = performance.now()

        this.#ctx.current = data
        this.#ctx.currentExpiresAt = now + expiresIn
        this.#ctx.currentFetchedAt = now
        this.onUpdated.emit(this.#ctx)

        if (this.params.autoReload) {
            if (this.#timeout) {
                timers.clearTimeout(this.#timeout)
            }
            this.#timeout = timers.setTimeout(() => {
                this.#ctx.isBackground = true
                this.update().catch(() => {})
            }, expiresIn + (this.params.autoReloadAfter ?? 0))
        }
    }

    /**
     * update the resource
     *
     * @param force  whether to force the update even if the resource hasn't expired yet
     */
    async update(force = false): Promise<void> {
        if (this.#updating) {
            await this.#updating.promise
            return
        }

        if (!force && !this.isStale) {
            return
        }

        this.#abort?.abort()
        this.#abort = new AbortController()
        this.#ctx.abort = this.#abort.signal
        this.#updating = new Deferred()

        let result
        try {
            result = await this.params.fetcher(this.#ctx)
        } catch (e) {
            if (this.params.onError) {
                this.params.onError(e, this.#ctx)
            } else {
                console.error(e)
            }
            this.#updating.resolve()
            this.#updating = undefined
            return
        }

        this.#updating.resolve()
        this.#updating = undefined

        this.setData(result.data, result.expiresIn)
    }

    /**
     * get the resource value, refreshing it if needed
     */
    async get(): Promise<T> {
        if (this.params.swr === true && this.#ctx.current !== null) {
            const validator = this.params.swrValidator

            if (!validator || validator(this.#ctx)) {
                this.#ctx.isBackground = true
                this.update(true).catch(() => {})
                return this.#ctx.current
            }
        }

        this.#ctx.isBackground = false
        await this.update()

        return asNonNull(this.#ctx.current)
    }

    /**
     * get the cached resource value immediately (if any)
     * note that it may be stale, which you should check separately
     */
    getCached(): T | null {
        return this.#ctx.current
    }

    destroy(): void {
        if (this.#timeout) timers.clearTimeout(this.#timeout)
        this.onUpdated.clear()
        this.#abort?.abort()
    }
}
