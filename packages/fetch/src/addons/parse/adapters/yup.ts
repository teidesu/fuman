import type { CastOptions, InferType, ISchema, ValidateOptions, ValidationError } from 'yup'

import type { FfetchParser, FfetchTypeProvider } from '../_types.js'

type YupSafeParseResult<R> =
    | { success: true, data: R }
    | { success: false, error: ValidationError }

export interface YupTypeProvider extends FfetchTypeProvider {
    readonly parsed: this['schema'] extends ISchema<any, any> ? InferType<this['schema']> : never
    readonly safeParsed: this['schema'] extends ISchema<any, any> ? YupSafeParseResult<InferType<this['schema']>> : never
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
        ? function (schema: unknown, value: unknown): unknown {
            return (schema as ISchema<any, any>).cast(value, options)
        }
        : async function (schema: unknown, value: unknown): Promise<unknown> {
            return (schema as ISchema<any, any>).validate(value, options)
        }
    const safeParse = action === 'cast'
        ? function (schema: unknown, value: unknown): unknown {
            try {
                const data: unknown = (schema as ISchema<any, any>).cast(value, options)
                return { success: true, data }
            } catch (e) {
                return { success: false, error: e }
            }
        }
        : async function (schema: unknown, value: unknown): Promise<unknown> {
            try {
                const data: unknown = await (schema as ISchema<any, any>).validate(value, options)
                return { success: true, data }
            } catch (e) {
                return { success: false, error: e }
            }
        }

    return {
        _provider,
        parse,
        safeParse,
    }
}
