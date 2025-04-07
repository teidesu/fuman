import type { ParseParams, SafeParseReturnType, z } from 'zod'

import type { FfetchParser, FfetchTypeProvider } from '../_types.js'

export interface ZodTypeProvider extends FfetchTypeProvider {
    readonly parsed: this['schema'] extends z.ZodTypeAny ? z.infer<this['schema']> : never
    readonly safeParsed: this['schema'] extends z.ZodTypeAny ? SafeParseReturnType<this['schema'], z.infer<this['schema']>> : never
}

export function ffetchZodAdapter({ async, ...rest }: Partial<ParseParams> = {}): FfetchParser<ZodTypeProvider> {
    const _provider = null as unknown as ZodTypeProvider
    const parse = async
        ? async function (schema: unknown, value: unknown): Promise<unknown> {
            return (schema as z.ZodTypeAny).parseAsync(value, rest)
        }
        : function (schema: unknown, value: unknown): unknown {
            return (schema as z.ZodTypeAny).parse(value, rest)
        }
    const safeParse = async
        ? async function (schema: unknown, value: unknown): Promise<z.SafeParseReturnType<unknown, unknown>> {
            return (schema as z.ZodTypeAny).safeParseAsync(value, rest)
        }
        : function (schema: unknown, value: unknown): z.SafeParseReturnType<unknown, unknown> {
            return (schema as z.ZodTypeAny).safeParse(value, rest)
        }

    return {
        _provider,
        parse,
        safeParse,
    }
}
