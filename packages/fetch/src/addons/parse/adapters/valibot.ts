import type { AnySchema, BaseIssue, BaseSchema, BaseSchemaAsync, Config, InferOutput } from 'valibot'

import type { FfetchParser, FfetchTypeProvider } from '../_types.js'
import { parse, parseAsync } from 'valibot'

export interface ValibotTypeProvider extends FfetchTypeProvider {
    readonly parsed: this['schema'] extends (
        BaseSchema<unknown, unknown, BaseIssue<unknown>> |
        BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>
    ) ? InferOutput<this['schema']> : never
}

export function ffetchValibotAdapter(
    { async, ...rest }: Partial<Config<BaseIssue<unknown>>> & { async?: boolean } = {},
): FfetchParser<ValibotTypeProvider> {
    const _provider = null as unknown as ValibotTypeProvider
    const parser = async
        ? async function (schema: unknown, value: unknown): Promise<unknown> {
            return parseAsync(schema as AnySchema, value, rest)
        }
        : function (schema: unknown, value: unknown): unknown {
            return parse(schema as AnySchema, value, rest)
        }

    return {
        _provider,
        parse: parser,
    }
}
