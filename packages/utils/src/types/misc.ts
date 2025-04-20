export type AnyToNever<T> = any extends T ? never : T
export type MaybePromise<T> = T | Promise<T>
export type MaybeArray<T> = T | T[]

export type Simplify<T> = { [KeyType in keyof T]: T[KeyType] } & {}
export type AnyFunction = (...args: any[]) => any
export type Values<T> = T[keyof T]

export type Truthy<T> = T extends false | '' | 0 | null | undefined ? never : T // from lodash

/**
 * Removes all `readonly` flags on a type (non-recursively), making it effectively mutable
 *
 * Considered unsafe as removing `readonly` modifiers may break semantics in some cases
 */
export type UnsafeMutable<T> = {
  -readonly [P in keyof T]: T[P]
}
