import type { ParseParams, z } from 'zod'

import type { FfetchParser, FfetchTypeProvider } from '../_types.js'

export interface ZodTypeProvider extends FfetchTypeProvider {
    readonly parsed: this['schema'] extends z.ZodTypeAny ? z.infer<this['schema']> : never
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

    return {
        _provider,
        parse,
    }
}
