import type { FfetchAddon } from './types.js'
import { urlencode } from './_utils.js'

export interface QueryAddon {
  /** query params to be appended to the url */
  query?: Record<string, unknown>
}

export interface QueryAddonOptions {
  /**
   * serializer for the query params.
   * given the query params and the url, it should return the serialized url
   * with the query params added
   *
   * @defaults `URLSearchParams`-based serializer, preserving all existing query params
   * @example `serialize({ a: 123, b: 'hello' }, 'https://example.com/api') => 'https://example.com/api?a=123&b=hello'`
   */
  serialize?: (query: Record<string, unknown>, url: string) => string
}

function defaultSerialize(query: Record<string, unknown>, url: string) {
  const params = urlencode(query)
  return url + (url.includes('?') ? '&' : '?') + params.toString()
}

export function query(options: QueryAddonOptions = {}): FfetchAddon<QueryAddon, object> {
  const { serialize = defaultSerialize } = options

  return {
    beforeRequest: (ctx) => {
      if (ctx.options.query || ctx.baseOptions.query) {
        const obj = ctx.baseOptions.query && ctx.options.query
          ? {
              ...ctx.baseOptions.query,
              ...ctx.options.query,
            }
          : ctx.options.query ?? ctx.baseOptions.query

        ctx.url = serialize(obj ?? {}, ctx.url)
      }
    },
  }
}
