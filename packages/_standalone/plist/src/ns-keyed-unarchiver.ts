/* eslint-disable ts/no-unsafe-member-access, ts/no-unsafe-argument */
import type { KeyedArchiverValueHeader } from './types.js'
import { assert, assertHasKey, objectEntries, unsafeCastType } from '@fuman/utils'
import { CORE_DATA_EPOCH, NS_KEYED_ARCHIVER_VERSION } from './_constants.js'
import { safeToNumber } from './_utils.js'
import { KeyedArchiverValue, PlistValue } from './types.js'

function isUid(value: unknown): value is PlistValue<'uid'> {
    return value instanceof PlistValue && value.type === 'uid'
}

export function nsKeyedUnarchive(data: unknown, params?: {
    /**
     * if true, every value will be wrapped in {@link KeyedArchiverValue},
     * allowing for lossless operation. otherwise, only unknown objects will be wrapped
     */
    preserveType?: boolean

    extraHandlers?: Record<string, (value: unknown, header: KeyedArchiverValueHeader, objects: unknown[]) => unknown>
}): unknown[] | Record<string, unknown> {
    const { preserveType = false, extraHandlers } = params ?? {}
    const extraHandlersEntries = extraHandlers ? objectEntries(extraHandlers) : undefined
    assert(typeof data === 'object' && data !== null, 'data is not an object')
    unsafeCastType<Record<string, unknown>>(data)

    if (data.$version !== NS_KEYED_ARCHIVER_VERSION) {
        throw new Error('unsupported NSKeyedArchiver version')
    }
    if (data.$archiver !== 'NSKeyedArchiver') {
        throw new Error('invalid or missing $archiver')
    }

    assertHasKey(data, '$objects')
    assert(Array.isArray(data.$objects), '$objects is not an array')
    assertHasKey(data, '$top')
    assert(typeof data.$top === 'object' && data.$top !== null, '$top is not an object')

    const objects = data.$objects as unknown[]

    const pending = new Map<number, unknown>()

    function parseByUid(uid: number): unknown {
        const obj = objects[uid]

        if (obj === '$null') return null
        if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean' || obj instanceof Uint8Array) return obj
        if (typeof obj === 'object' && obj !== null) {
            assertHasKey(obj, '$class')
            assert(isUid(obj.$class), '$class is not a UID')
            const header = objects[safeToNumber(obj.$class.value)]

            assert(typeof header === 'object' && header !== null, 'referenced $class is not an object')
            assertHasKey(header, '$classes')
            assert(Array.isArray(header.$classes), '$classes is not an array')
            unsafeCastType<KeyedArchiverValueHeader>(header)

            const classes = header.$classes
            if (extraHandlersEntries) {
                for (const [key, handler] of extraHandlersEntries) {
                    if (classes.includes(key)) {
                        return handler(obj, header, objects)
                    }
                }
            }

            if (classes.includes('NSDictionary')) {
                assertHasKey(obj, 'NS.keys')
                assertHasKey(obj, 'NS.objects')
                assert(Array.isArray(obj['NS.keys']), 'NS.keys is not an array')
                assert(Array.isArray(obj['NS.objects']), 'NS.objects is not an array')
                const keys = obj['NS.keys']
                const values = obj['NS.objects']

                if (keys.length !== values.length) {
                    throw new Error('invalid NSDictionary')
                }

                const result: Record<string, any> = {}
                pending.set(uid, result)
                for (let i = 0; i < keys.length; i++) {
                    assert(isUid(keys[i]), 'key is not a UID')
                    assert(isUid(values[i]), 'value is not a UID')
                    const keyUid = safeToNumber(keys[i].value)
                    const valueUid = safeToNumber(values[i].value)

                    let parsedKey = parseByUid(keyUid)
                    if (preserveType && parsedKey instanceof KeyedArchiverValue) {
                        parsedKey = parsedKey.value
                    }
                    assert(typeof parsedKey === 'string' || typeof parsedKey === 'number', 'key is not a string or number')
                    if (pending.has(valueUid)) {
                        result[parsedKey] = pending.get(valueUid)
                    } else {
                        result[parsedKey] = parseByUid(valueUid)
                    }
                }

                pending.delete(uid)

                return preserveType ? new KeyedArchiverValue(header, result) : result
            }

            if (classes.includes('NSDate')) {
                assertHasKey(obj, 'NS.time')
                assert(typeof obj['NS.time'] === 'number', 'NS.time is not a number')
                const val = new Date(obj['NS.time'] * 1000 + CORE_DATA_EPOCH)
                return preserveType ? new KeyedArchiverValue(header, val) : val
            }

            const isSet = classes.includes('NSSet')
            if (classes.includes('NSArray') || isSet) {
                assertHasKey(obj, 'NS.objects')
                assert(Array.isArray(obj['NS.objects']))

                const result: unknown[] = []
                pending.set(uid, result)
                for (const value of obj['NS.objects']) {
                    const valueUid = safeToNumber(value.value)
                    if (pending.has(valueUid)) {
                        result.push(pending.get(valueUid))
                    } else {
                        result.push(parseByUid(valueUid))
                    }
                }
                pending.delete(uid)

                if (isSet) {
                    const set = new Set(result)
                    return preserveType ? new KeyedArchiverValue(header, set) : set
                }

                return preserveType ? new KeyedArchiverValue(header, result) : result
            }

            // some implementations might use a class extended from NSString/NSData, and those
            // wont be serialized as simple strings/buffers
            if (classes.includes('NSString')) {
                assertHasKey(obj, 'NS.string')
                assert(typeof obj['NS.string'] === 'string')
                const val = obj['NS.string']
                return preserveType ? new KeyedArchiverValue(header, val) : val
            }

            if (classes.includes('NSData')) {
                assertHasKey(obj, 'NS.data')
                assert(obj['NS.data'] instanceof Uint8Array)
                const val = obj['NS.data']
                return preserveType ? new KeyedArchiverValue(header, val) : val
            }

            const result: Record<string, any> = {}
            pending.set(uid, result)
            for (const key in obj) {
                if (key === '$class') continue
                const value = (obj as Record<string, unknown>)[key]
                if (isUid(value)) {
                    const valueUid = safeToNumber(value.value)
                    if (pending.has(valueUid)) {
                        result[key] = pending.get(valueUid)
                    } else {
                        result[key] = parseByUid(valueUid)
                    }
                } else {
                    result[key] = value
                }
            }
            pending.delete(uid)
            return new KeyedArchiverValue(header, result)
        }
    }

    if (!('root' in data.$top)) {
        // top-level arrays are serialized as `{ $0: uid, $1: uid, ... }`
        const count = Object.keys(data.$top).length
        const array: unknown[] = []

        for (let i = 0; i < count; i++) {
            const key = `$${i}`
            assertHasKey(data.$top, key)
            assert(isUid(data.$top[key]), `${key} is not a UID`)
            array.push(parseByUid(safeToNumber(data.$top[key].value)))
        }

        return array
    }

    assert(isUid(data.$top.root), '$top.root is not a UID')

    const topObject = parseByUid(safeToNumber(data.$top.root.value))
    if (typeof topObject !== 'object' || topObject === null) {
        throw new Error('top object is not an object')
    }
    return topObject as Record<string, unknown>
}
