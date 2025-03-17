import type { Brand } from '../types/brand.js'

export function assert(condition: boolean, message?: unknown): asserts condition {
    if (!condition) {
        throw new Error(typeof message == 'string' ? message : 'Assertion failed', {
            cause: message,
        })
    }
}

export function assertHasKey<Obj extends object, Key extends string>(obj: Obj, key: Key): asserts obj is Obj & Record<Key, unknown> {
    if (!(key in obj)) {
        throw new Error(`key ${JSON.stringify(key)} not found in object`, {
            cause: { obj, key },
        })
    }
}

export function unsafeCastType<T>(value: unknown): asserts value is T {
    // :3
}

export function assertNonNull<T>(value: T): asserts value is Exclude<T, null | undefined> {
    if (value === null || value === undefined) {
        throw new Error(`value is ${value as string}`)
    }
}

export function asNonNull<T>(
    value: null extends T ? T
        : undefined extends T ? T
            : Brand<'type is not nullable', 'TypeError'>,
): Exclude<T, null | undefined> {
    assertNonNull(value)
    return value as Exclude<T, null | undefined>
}

export function assertMatches(str: string, regex: RegExp): RegExpMatchArray {
    const match = str.match(regex)
    if (!match) {
        throw new Error(`${JSON.stringify(str)} does not match ${regex}`, {
            cause: { regex, str },
        })
    }

    return match
}
