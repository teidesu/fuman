import type { FfetchMiddleware } from '../_types.js'
import type { FfetchAddon } from './types.js'
import { sleep } from '@fuman/utils'

export class RetriesExceededError extends Error {
  constructor(readonly retries: number, readonly request: Request) {
    super(`Retries (${retries}) exceeded for ${request.url}`)
  }
}

export interface RetryOptions {
  /**
   * max number of retries
   * @default 5
   */
  maxRetries?: number

  /**
   * delay between retries
   * @default retryCount * 1000, up to 5000
   */
  retryDelay?: number | ((retryCount: number) => number)

  /**
   * function that will be called before starting the retry loop.
   * if it returns false, the retry loop will be skipped and
   * the error will be thrown immediately
   *
   * @default () => false
   */
  skip?: (request: Request) => boolean

  /**
   * function that will be called before a retry is attempted,
   * and can be used to modify the request before proceeding
   *
   * @param attempt  current retry attempt (starts at 0)
   */
  onRetry?: (attempt: number, request: Request) => Request | void

  /**
   * function that will be called whenever a response is received,
   * and should return whether the response is valid (i.e. should be returned and not retried)
   *
   * @default  `response => response.status < 500`
   */
  onResponse?: (response: Response, request: Request) => boolean

  /**
   * function that will be called if an error is thrown while calling
   * the rest of the middleware chain,
   * and should return whether the error should be retried
   *
   * @default  `() => true`
   */
  onError?: (err: unknown, request: Request) => boolean

  /**
   * if true, the last response will be returned if the number of retries is exceeded
   * instead of throwing {@link RetriesExceededError}
   *
   * @default false
   */
  returnLastResponse?: boolean
}

export interface RetryAddon {
  retry?: RetryOptions | false
}

function defaultRetryDelay(retryCount: number) {
  if (retryCount >= 5) return 5000
  return retryCount * 1000
}

function retryMiddleware(options: RetryOptions): FfetchMiddleware {
  const {
    maxRetries = 5,
    retryDelay = defaultRetryDelay,
    onResponse = response => response.status < 500,
    returnLastResponse = false,
    onError,
    onRetry,
    skip,
  } = options

  return async (request, next) => {
    if (skip?.(request)) {
      return next(request)
    }

    let retries = 0
    let lastResponse: Response | undefined

    while (true) {
      onRetry?.(retries, request)

      try {
        const res = await next(request)

        if (onResponse(res, request)) {
          return res
        }
      } catch (err) {
        if (onError && !onError(err, request)) {
          throw err
        }
      }

      if (retries++ >= maxRetries) {
        if (lastResponse && returnLastResponse) {
          return lastResponse
        }

        throw new RetriesExceededError(maxRetries, request)
      }

      await sleep(typeof retryDelay === 'function' ? retryDelay(retries) : retryDelay)
    }
  }
}

export function retry(): FfetchAddon<RetryAddon, object> {
  return {
    beforeRequest: (ctx) => {
      if (ctx.options.retry != null || ctx.baseOptions.retry != null) {
        let options: RetryOptions

        if (ctx.baseOptions.retry != null) {
          if (ctx.options.retry === false) {
            return
          }

          options = ctx.options.retry
            ? {
                ...ctx.baseOptions.retry,
                ...ctx.options.retry,
              }
            : ctx.baseOptions.retry as RetryOptions
        } else if (ctx.options.retry === false) {
          return
        } else {
          options = ctx.options.retry as RetryOptions
        }

        ctx.options.middlewares ??= []
        ctx.options.middlewares.push(retryMiddleware(options))
      }
    },
  }
}
