export function unknownToError(err: unknown): Error {
    if (err instanceof Error) return err
    if (typeof err === 'string') return new Error(err)
    return new Error(JSON.stringify(err), { cause: err })
}

export class NotImplementedError extends Error {
    constructor(message?: string) {
        super(`Not implemented${message != null ? `: ${message}` : ''}`)
    }
}

export function notImplemented(message?: string): never {
    throw new NotImplementedError(message)
}

export function unreachable(): never {
    throw new Error('Unreachable')
}

export { notImplemented as todo }
