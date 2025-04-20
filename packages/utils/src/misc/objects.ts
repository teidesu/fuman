import type { MaybeArray } from '../types/misc.js'

/**
 * Strictly typed `Object.keys`
 */
export function objectKeys<T extends object>(obj: T): Array<`${keyof T & (string | number | boolean | null | undefined)}`> {
  return Object.keys(obj) as Array<`${keyof T & (string | number | boolean | null | undefined)}`>
}

/**
 * Strictly typed `Object.entries`
 */
export function objectEntries<T extends object>(obj: T): Array<[keyof T, T[keyof T]]> {
  return Object.entries(obj) as Array<[keyof T, T[keyof T]]>
}

/**
 * remove undefined fields from an object (! mutates the object !)
 */
export function clearUndefined<T extends object>(obj: T): T {
  for (const key in obj) {
    if (!Object.hasOwn(obj, key)) continue
    if (obj[key] === undefined) {
      delete obj[key]
    }
  }

  return obj
}

export type MergeInsertions<T> =
  T extends object
    ? { [K in keyof T]: MergeInsertions<T[K]> }
    : T

export type DeepMerge<F, S> = MergeInsertions<{
  [K in keyof F | keyof S]: K extends keyof S & keyof F
    ? DeepMerge<F[K], S[K]>
    : K extends keyof S
      ? S[K]
      : K extends keyof F
        ? F[K]
        : never;
}>

export interface DeepMergeOptions {
  /**
   * when `undefined` value is encountered, should we **replace** the value
   * in the target object with `undefined` or **ignore** it?
   *
   * @default 'ignore'
   */
  undefined?: 'replace' | 'ignore'

  /**
   * when a property is encountered that is already present in the target object,
   * should we **replace** the value in the target object with the value from
   * the source object or **ignore** it?
   *
   * @default 'replace'
   */
  properties?: 'replace' | 'ignore'

  /**
   * when an array is encountered that is already present in the target object,
   * should we **replace** the value in the target object with the value from
   * the source object, **merge** the arrays together or **ignore** it?
   *
   * @default 'replace'
   */
  arrays?: 'replace' | 'merge' | 'ignore'

  /**
   * when an object is encountered that is already present in the target object,
   * should we **replace** the value in the target object with the value from
   * the source object, **merge** the objects together or **ignore** it?
   *
   * @default 'merge'
   */
  objects?: 'replace' | 'merge' | 'ignore'
}

export function deepMerge<T extends object = object>(into: T, from: MaybeArray<T>, options?: DeepMergeOptions): T
export function deepMerge<T extends object = object, S extends object = T>(into: T, from: MaybeArray<S>, options?: DeepMergeOptions): DeepMerge<T, S>
export function deepMerge<T extends object = object, S extends object = T>(into: T, from: MaybeArray<T>, options?: DeepMergeOptions): DeepMerge<T, S> {
  if (!Array.isArray(from)) from = [from]
  if (from.length === 0) return into as DeepMerge<T, S>

  const {
    undefined: onUndefined = 'ignore',
    properties: onProperties = 'replace',
    arrays: onArrays = 'replace',
    objects: onObjects = 'merge',
  } = options ?? {}

  for (let i = 0; i < from.length; i++) {
    const fromItem = from[i]

    for (const key in fromItem) {
      if (!Object.hasOwn(fromItem, key)) continue

      const value = fromItem[key]
      const existing = into[key]
      if (value === undefined) {
        if (onUndefined === 'replace') {
          // eslint-disable-next-line ts/no-unsafe-member-access
          (into as any)[key] = undefined
        }
        continue
      }

      if (Array.isArray(value)) {
        if (onArrays === 'merge') {
          if (Array.isArray(existing)) {
            for (let j = 0; j < value.length; j++) {
              existing.push(value[j])
            }
          } else {
            into[key] = value
          }
          continue
        }

        if (onArrays === 'ignore' && existing !== undefined) continue
        into[key] = value
        continue
      }

      if (typeof value === 'object' && value !== null) {
        if (onObjects === 'merge') {
          if (typeof existing === 'object' && existing !== null) {
            into[key] = deepMerge(existing, value)
            continue
          } else {
            into[key] = value
          }
          continue
        }

        if (onObjects === 'ignore' && existing !== undefined) continue
        into[key] = value
        continue
      }

      if (onProperties === 'ignore' && existing !== undefined) continue
      into[key] = value
    }
  }

  return into as DeepMerge<T, S>
}
