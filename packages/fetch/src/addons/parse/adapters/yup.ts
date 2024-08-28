import type { CastOptions, InferType, ISchema, ValidateOptions } from 'yup'

import type { FfetchParser, FfetchTypeProvider } from '../_types.js'

export interface YupTypeProvider extends FfetchTypeProvider {
    readonly parsed: this['schema'] extends ISchema<any, any> ? InferType<this['schema']> : never
}

export type FfetchYupAdapterOptions =
    | { action: 'cast', options?: CastOptions }
    | { action: 'validate', options?: ValidateOptions }

export function ffetchYupAdapter({
    action,
    options,
}: FfetchYupAdapterOptions = { action: 'validate' }): FfetchParser<YupTypeProvider> {
    const _provider = null as unknown as YupTypeProvider
    const parse = action === 'cast'
        ? async function (schema: unknown, value: unknown): Promise<unknown> {
            return (schema as ISchema<any, any>).cast(value, options)
        }
        : function (schema: unknown, value: unknown): unknown {
            return (schema as ISchema<any, any>).validate(value, options)
        }

    return {
        _provider,
        parse,
    }
}
