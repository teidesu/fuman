import type { FfetchMiddleware } from '../_types.js'
import type { FetchAddonCtx, FfetchAddon } from './types.js'
import { timers } from '@fuman/utils'

export class TimeoutError extends Error {
  constructor(readonly timeout: number) {
    super(`Timeout exceeded: ${timeout}ms`)
  }
}

export interface TimeoutAddon {
  /**
   * timeout for the request in ms
   *
   * pass `Infinity` or `0` to disable the default timeout from the base options
   *
   * when the timeout is reached, the request will be aborted
   * and the promise will be rejected with a TimeoutError
   */
  timeout?: number | ((ctx: FetchAddonCtx<TimeoutAddon>) => number)
}

function timeoutMiddleware(timeout: number): FfetchMiddleware {
  return async (request, next) => {
    const controller = new AbortController()
    const outer = request.signal
    let onAbort: (() => void) | undefined

    const timer = timers.setTimeout(() => {
      controller.abort(new TimeoutError(timeout))
    }, timeout)

    if (outer != null) {
      if (outer.aborted) {
        timers.clearTimeout(timer)
        throw outer.reason
      }
      onAbort = () => {
        controller.abort(outer.reason)
        timers.clearTimeout(timer)
      }
      outer.addEventListener('abort', onAbort, { once: true })
    }

    request = new Request(request, {
      signal: controller.signal,
    })

    try {
      return await next(request)
    } finally {
      timers.clearTimeout(timer)
      if (outer != null && onAbort != null) {
        outer.removeEventListener('abort', onAbort)
      }
    }
  }
}

/**
 * ffetch addon that allows setting a timeout for the request.
 * when the timeout is reached, the request will be aborted
 * and the promise will be rejected with a TimeoutError
 *
 * **note**: it is important to put this addon as the last one,
 * otherwise other middlewares might be counted towards the timeout
 */
export function timeout(): FfetchAddon<TimeoutAddon, object> {
  return {
    beforeRequest: (ctx) => {
      if (ctx.options.timeout != null || ctx.baseOptions.timeout != null) {
        // at least one of the two is set
        // eslint-disable-next-line ts/no-non-null-assertion
        let timeout = (ctx.options.timeout ?? ctx.baseOptions.timeout)!
        if (typeof timeout === 'function') {
          timeout = timeout(ctx)
        }

        if (timeout === Infinity || timeout <= 0) {
          return
        }

        ctx.options.middlewares ??= []
        ctx.options.middlewares?.push(timeoutMiddleware(timeout))
      }
    },
  }
}
