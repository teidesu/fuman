export function unknownToError(err: unknown): Error {
    if (err instanceof Error) return err
    if (typeof err === 'string') return new Error(err)
    return new Error(JSON.stringify(err), { cause: err })
}
