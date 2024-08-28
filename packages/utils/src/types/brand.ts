declare const brand: unique symbol

export type Brand<T, Name extends string> = T & { [brand]: Name }
