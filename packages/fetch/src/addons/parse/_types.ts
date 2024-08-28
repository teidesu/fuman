export interface FfetchTypeProvider {
    readonly schema: unknown
    readonly parsed: unknown
}

export interface FfetchParser<TypeProvider extends FfetchTypeProvider> {
    readonly _provider: TypeProvider
    parse: (schema: unknown, value: unknown) => unknown | Promise<unknown>
}

export type CallTypeProvider<TypeProvider extends FfetchTypeProvider, Schema> = (TypeProvider & { schema: Schema })['parsed']
