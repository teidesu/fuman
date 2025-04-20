import type { Middleware } from './composer.js'

import { describe, expect, it } from 'vitest'

import { composeMiddlewares } from './composer.js'

describe('composeMiddlewares', () => {
  it('should compose middlewares', async () => {
    const trace: unknown[] = []
    const middlewares: Middleware<number[]>[] = [
      async (ctx, next) => {
        trace.push(ctx)
        trace.push(1)
        await next([...ctx, 1])
        trace.push(6)
      },
      async (ctx, next) => {
        trace.push(ctx)
        trace.push(2)
        await next([...ctx, 2])
        trace.push(5)
      },
      async (ctx, next) => {
        trace.push(ctx)
        trace.push(3)
        await next([...ctx, 3])
        trace.push(4)
      },
    ]

    const composed = composeMiddlewares(middlewares, async (res) => {
      // eslint-disable-next-line ts/no-use-before-define
      result = res
    })

    let result: readonly number[] = []
    await composed([])

    expect(trace).toEqual([[], 1, [1], 2, [1, 2], 3, 4, 5, 6])
    expect(result).toEqual([1, 2, 3])
  })

  it('should handle multiple calls to final', async () => {
    const trace: unknown[] = []

    const middlewares: Middleware<number[]>[] = [
      async (ctx, next) => {
        trace.push(1)
        await next([2])
        trace.push(3)
        await next([4])
        trace.push(5)
      },
    ]

    const composed = composeMiddlewares(middlewares, async (res) => {
      trace.push(res)
    })

    await composed([])

    expect(trace).toEqual([1, [2], 3, [4], 5])
  })

  it('should handle multiple calls to next midway', async () => {
    const trace: unknown[] = []

    const middlewares: Middleware<number[]>[] = [
      async (ctx, next) => {
        trace.push(1)
        await next([2])
        trace.push(3)
        await next([4])
        trace.push(5)
      },
      (ctx, next) => next([6, ...ctx]),
    ]

    const composed = composeMiddlewares(middlewares, async (res) => {
      trace.push(res)
    })

    await composed([])

    expect(trace).toEqual([1, [6, 2], 3, [6, 4], 5])
  })

  it('should handle leaf middleware', async () => {
    const trace: unknown[] = []

    const middlewares: Middleware<number[]>[] = [
      async (ctx, next) => {
        trace.push(1)

        return next(ctx)
      },
      async () => {
        /* do nothing */
      },
    ]

    const composed = composeMiddlewares(middlewares, async (res) => {
      trace.push(res) // should not be called
    })

    await composed([])

    expect(trace).toEqual([1])
  })

  it('should propagate return value', async () => {
    const trace: unknown[] = []

    const middlewares: Middleware<number[], number>[] = [
      async (ctx, next) => {
        trace.push(1)
        const res = await next([2])
        trace.push(3)
        const res2 = await next([3, 4, 5])
        trace.push(6)

        return res + res2
      },
      async (ctx, next) => {
        trace.push(-1)

        return (await next(ctx)) + 1
      },
    ]

    const composed = composeMiddlewares(middlewares, async (res) => {
      trace.push(res)

      return res.length
    })

    const result = await composed([])

    expect(trace).toEqual([1, -1, [2], 3, -1, [3, 4, 5], 6])
    expect(result).toBe(6)
  })

  it('should propagate errors', async () => {
    const trace: unknown[] = []

    const middlewares: Middleware<number>[] = [
      async (ctx, next) => {
        trace.push(1)

        try {
          await next(2)
        } catch {
          trace.push('caught error')
        }

        trace.push(3)
        await next(4)
        trace.push(5)
      },
      (ctx, next) => next(ctx), // pass-thru
      async (ctx, next) => {
        if (ctx === 2) {
          trace.push('error')
          throw new Error('error')
        } else {
          trace.push('ok')

          return next(ctx)
        }
      },
    ]

    const composed = composeMiddlewares(middlewares, async (res) => {
      trace.push(`final ${res}`)
    })

    await composed(0)

    expect(trace).toEqual([1, 'error', 'caught error', 3, 'ok', 'final 4', 5])
  })

  it('should support open-ended middleware', async () => {
    const trace: unknown[] = []

    const middlewares: Middleware<number>[] = [
      async (ctx, next) => {
        trace.push(1)
        await next(2)
        trace.push(3)
        await next(4)
      },
    ]

    const composed = composeMiddlewares(middlewares)

    await composed(0, async (ctx) => {
      trace.push(`final ${ctx}`)
    })

    expect(trace).toEqual([1, 'final 2', 3, 'final 4'])
  })

  it('should support composing open-ended middleware', async () => {
    const trace: unknown[] = []

    const middlewares: Middleware<number>[] = [
      async (ctx, next) => {
        trace.push(1)
        await next(2)
        trace.push(3)
        await next(4)
      },
    ]

    const composed = composeMiddlewares(middlewares)

    middlewares.push(async (ctx) => {
      trace.push(`final ${ctx}`)
    })

    const composed2 = composeMiddlewares(middlewares)

    await composed(0, ctx => composed2(ctx, () => Promise.resolve()))

    expect(trace).toEqual([1, 1, 'final 2', 3, 'final 4', 3, 1, 'final 2', 3, 'final 4'])
  })
})
