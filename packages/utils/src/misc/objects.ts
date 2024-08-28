/**
 * Strictly typed `Object.keys`
 */
export function objectKeys<T extends object>(obj: T) {
    return Object.keys(obj) as Array<`${keyof T & (string | number | boolean | null | undefined)}`>
}

/**
 * Strictly typed `Object.entries`
 */
export function objectEntries<T extends object>(obj: T) {
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
