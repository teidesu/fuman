export type Middleware<Context, Result = void> = (
  ctx: Context,
  next: (ctx: Context) => Promise<Result>,
) => Promise<Result>
export type ComposedMiddleware<Context, Result = void> = (ctx: Context) => Promise<Result>

export function composeMiddlewares<Context, Result = void>(
  middlewares: Middleware<Context, Result>[],
  final: ComposedMiddleware<Context, Result>,
): ComposedMiddleware<Context, Result>

export function composeMiddlewares<Context, Result = void>(
  middlewares: Middleware<Context, Result>[],
): Middleware<Context, Result>

export function composeMiddlewares<Context, Result = void>(
  middlewares: Middleware<Context, Result>[],
  final?: ComposedMiddleware<Context, Result>,
): Middleware<Context, Result> {
  middlewares = middlewares.slice()

  if (final == null) {
    return function (context: Context, next: Middleware<Context, Result>): Promise<Result> {
      // open-ended middleware. a bit less performant, but more flexible for some use cases
      function dispatch(i: number, ctx: Context): Promise<Result> {
        const fn = middlewares[i] ?? next

        return fn(ctx, dispatch.bind(null, i + 1))
      }

      return dispatch(0, context)
    }
  }

  middlewares.push(final)

  function dispatch(i: number, ctx: Context): Promise<Result> {
    const fn = middlewares[i]

    // eslint-disable-next-line ts/no-use-before-define
    return fn(ctx, boundDispatches[i + 1])
  }

  const boundDispatches: Array<(ctx: Context) => Promise<Result>> = []

  for (let i = 0; i < middlewares.length; i++) {
    boundDispatches.push(dispatch.bind(null, i))
  }

  return function (context: Context): Promise<Result> {
    return boundDispatches[0](context)
  }
}
