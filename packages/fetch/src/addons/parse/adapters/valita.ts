import type * as v from '@badrap/valita'

import type { FfetchParser, FfetchTypeProvider } from '../_types.js'

export interface ValitaTypeProvider extends FfetchTypeProvider {
    readonly parsed: this['schema'] extends v.Type<any> ? v.Infer<this['schema']> : never
}

type ParseOptions = NonNullable<Parameters<v.Type<any>['parse']>[1]>

export function ffetchValitaAdapter(options?: ParseOptions): FfetchParser<ValitaTypeProvider> {
    const _provider = null as unknown as ValitaTypeProvider

    return {
        _provider,
        parse(schema: unknown, value: unknown): unknown {
            return (schema as v.Type<any>).parse(value, options)
        },
    }
}
