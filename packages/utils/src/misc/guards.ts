import type { AnyFunction, Truthy } from '../types/misc.js'

export const isNotUndefined = <T>(val: T): val is Exclude<T, undefined> => val !== undefined
export const isNotNull = <T>(val: T): val is Exclude<T, null> => val !== null
export const isBoolean = (val: any): val is boolean => typeof val === 'boolean'
export const isTruthy = <T>(val: T): val is Truthy<T> => Boolean(val)
// eslint-disable-next-line ts/strict-boolean-expressions
export const isFalsy = <T>(val: T): val is Exclude<T, Truthy<T>> => !val
export const isFunction = (val: any): val is AnyFunction => typeof val === 'function'
export const isNumber = (val: any): val is number => typeof val === 'number'
export const isString = (val: unknown): val is string => typeof val === 'string'
export const isSymbol = (val: any): val is symbol => typeof val === 'symbol'
export const isBigInt = (val: any): val is bigint => typeof val === 'bigint'
export const isObject = (val: any): val is object => typeof val === 'object' && val !== null
