import type { FfetchMiddleware } from '../_types.js'
import type { FfetchAddon } from './types.js'
import { type MaybePromise, sleep } from '@fuman/utils'

export interface RateLimitAddon {
    rateLimit?: {
        /**
         * check if the request was rejected due to rate limit
         *
         * @default `res => res.status === 429`
         */
        isRejected?: (res: Response) => MaybePromise<boolean>

        /**
         * getter for the unix timestamp of the next reset
         * can either be a unix timestamp in seconds or an ISO 8601 date string
         *
         * @default `res => res.headers.get('x-ratelimit-reset')`
         */
        getReset?: (res: Response) => MaybePromise<string | number | null>

        /**
         * when the rate limit is exceeded (i.e. `getRemaining` returns 0),
         * but the reset time is unknown (i.e. `getReset` returns `null`),
         * what is the default time to wait until the rate limit is reset?
         * in milliseconds
         *
         * @default `30_000`
         */
        defaultWaitTime?: number

        /**
         * number of milliseconds to add to the reset time when the rate limit is exceeded,
         * to account for network latency and other factors
         *
         * @default `5000`
         */
        jitter?: number

        /**
         * when the rate limit has exceeded (i.e. `getRemaining` returns 0),
         * what is the maximum acceptable time to wait until the rate limit is reset?
         * in milliseconds
         *
         * @default `300_000`
         */
        maxWaitTime?: number

        /**
         * maximum number of retries
         *
         * @default `3`
         */
        maxRetries?: number

        /**
         * function that will be called when the rate limit is exceeded
         *
         * @param res the response that caused the rate limit to be exceeded
         * @param waitTime the time to wait until the rate limit is reset (in milliseconds)
         */
        onRateLimitExceeded?: (res: Response, waitTime: number) => void
    }
}

const defaultIsRejected = (res: Response) => res.status === 429
const defaultGetReset = (res: Response) => res.headers.get('x-ratelimit-reset')

function tryParseDate(str: string | number | null): number | null {
    if (str == null) return null
    if (typeof str === 'number') return str * 1000

    const asNum = Number(str)
    if (!Number.isNaN(asNum)) return asNum * 1000

    // try to parse as Date
    const asDate = new Date(str)
    if (asDate.toString() === 'Invalid Date') return null
    return asDate.getTime()
}

function rateLimitMiddleware(options: NonNullable<RateLimitAddon['rateLimit']>): FfetchMiddleware {
    const {
        isRejected = defaultIsRejected,
        getReset = defaultGetReset,
        defaultWaitTime = 30_000,
        maxWaitTime = 300_000,
        jitter = 5_000,
        maxRetries = 5,
        onRateLimitExceeded,
    } = options

    return async (req, next) => {
        let attempts = 0

        while (true) {
            if (attempts > maxRetries) throw new Error('Rate limit exceeded, maximum retries exceeded')
            attempts += 1

            const res = await next(req)

            const rejected = await isRejected(res)
            if (!rejected) return res

            const reset = tryParseDate(await getReset(res))

            let waitTime: number | undefined
            if (reset == null) {
                // unknown reset time, wait for the default time
                waitTime = defaultWaitTime
            } else {
                waitTime = reset - Date.now() + jitter
                if (waitTime < 0) {
                    // reset time is in the past, retry immediately
                    waitTime = undefined
                } else if (waitTime > maxWaitTime) {
                    // reset time is too far in the future, throw
                    throw new Error(`Rate limit exceeded, reset time is too far in the future: ${new Date(reset).toISOString()}`)
                }
            }

            if (waitTime == null) {
                onRateLimitExceeded?.(res, 0)
                // do not wait, retry immediately
                continue
            }

            onRateLimitExceeded?.(res, waitTime)

            await sleep(waitTime)
        }
    }
}

/**
 * ffetch addon that handles "rate limit exceeded" errors,
 * and waits until the rate limit is reset
 */
export function rateLimitHandler(): FfetchAddon<RateLimitAddon, object> {
    return {
        beforeRequest: (ctx) => {
            if (ctx.options.rateLimit != null || ctx.baseOptions.rateLimit != null) {
                const options = { ...ctx.baseOptions.rateLimit, ...ctx.options.rateLimit }

                ctx.options.middlewares ??= []
                ctx.options.middlewares?.push(rateLimitMiddleware(options))
            }
        },
    }
}
