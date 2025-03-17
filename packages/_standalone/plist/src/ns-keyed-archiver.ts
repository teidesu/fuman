import type { KeyedArchiverValueHeader } from './types.js'
import { unreachable } from '@fuman/utils'
import { CORE_DATA_EPOCH, NS_KEYED_ARCHIVER_VERSION } from './_constants.js'
import { KeyedArchiverValue, PlistValue } from './types.js'
import { safeToNumber } from './_utils.js'

// this is quite similar to BinaryPlistWriter in its essence, yet at the same time
// different enough for it to not make sense to refactor stuff somehow.

type PlistUid = PlistValue<'uid'>

const NsDictionaryHeader: KeyedArchiverValueHeader = {
    $classname: 'NSDictionary',
    $classes: ['NSDictionary', 'NSObject'],
}
const NsArrayHeader: KeyedArchiverValueHeader = {
    $classname: 'NSArray',
    $classes: ['NSArray', 'NSObject'],
}
const NsDateHeader: KeyedArchiverValueHeader = {
    $classname: 'NSDate',
    $classes: ['NSDate', 'NSObject'],
}

class NsKeyedArchiver {
    #values = new Map<unknown, PlistUid>()
    #objects: unknown[] = []
    #nextUid = 0

    #allocateUid(): PlistUid {
        return new PlistValue('uid', this.#nextUid++)
    }

    #serializeObject(uid: PlistUid, header: KeyedArchiverValueHeader, object: Record<string, unknown>): PlistUid {
        let headerUid = this.#values.get(header)
        if (!headerUid) {
            headerUid = this.#allocateUid()
            this.#values.set(header, headerUid)
            this.#objects[safeToNumber(headerUid.value)] = header
        }
        object.$class = headerUid

        this.#objects[safeToNumber(uid.value)] = object
        return uid
    }

    #serializeValue(value: unknown): PlistUid {
        const existing = this.#values.get(value)
        if (existing) return existing

        // NB: it's crucial to allocate the uid before doing anything else to support circular references
        const uid = this.#allocateUid()
        const uidValue = safeToNumber(uid.value)
        this.#values.set(value, uid)

        switch (typeof value) {
            case 'string':
            case 'number':
            case 'bigint':
            case 'boolean':
                this.#objects[uidValue] = value
                return uid
            case 'object': {
                if (value === null) unreachable() // should already be in this.#values
                let overrideHeader: KeyedArchiverValueHeader | undefined
                if (value instanceof KeyedArchiverValue) {
                    overrideHeader = value.header
                    value = value.value

                    if (typeof value === 'string') {
                        return this.#serializeObject(uid, overrideHeader, {
                            'NS.string': value,
                        })
                    }
                    if (value instanceof Uint8Array) {
                        return this.#serializeObject(uid, overrideHeader, {
                            'NS.data': value,
                        })
                    }
                    if (!value || typeof value !== 'object') {
                        throw new Error('invalid value in KeyedArchiverValue', { cause: value })
                    }
                }
                if (value instanceof Uint8Array) {
                    this.#objects[uidValue] = value
                    return uid
                }
                if (value instanceof Date) {
                    return this.#serializeObject(uid, overrideHeader ?? NsDateHeader, {
                        'NS.time': (value.getTime() - CORE_DATA_EPOCH) / 1000,
                    })
                }
                if (value instanceof Set) value = Array.from(value)
                if (value instanceof Map) value = Object.fromEntries(value)
                if (Array.isArray(value)) {
                    const uids = value.map(item => this.#serializeValue(item))
                    return this.#serializeObject(uid, overrideHeader ?? NsArrayHeader, {
                        'NS.objects': uids,
                    })
                }

                // generic object
                const keyUids: PlistUid[] = []
                const valueUids: PlistUid[] = []

                for (const [key, dictValue] of Object.entries(value as Record<string, unknown>)) {
                    keyUids.push(this.#serializeValue(key))
                    valueUids.push(this.#serializeValue(dictValue))
                }

                return this.#serializeObject(uid, overrideHeader ?? NsDictionaryHeader, {
                    'NS.keys': keyUids,
                    'NS.objects': valueUids,
                })
            }
            default: throw new Error(`invalid value: ${value}`)
        }
    }

    writeTop(value: unknown[] | Record<string, unknown>): Record<string, unknown> {
        // replicate the behavior of the apple implementation which always pushes $null as the first element
        this.#objects.push('$null')
        this.#values.set(null, this.#allocateUid())

        let top: unknown
        if (Array.isArray(value)) {
            const obj: Record<string, unknown> = {}
            for (let i = 0; i < value.length; i++) {
                obj[`$${i}`] = this.#serializeValue(value[i])
            }
            top = obj
        } else {
            top = {
                root: this.#serializeValue(value),
            }
        }

        return {
            $version: NS_KEYED_ARCHIVER_VERSION,
            $archiver: 'NSKeyedArchiver',
            $top: top,
            $objects: this.#objects,
        }
    }
}

export function nsKeyedArchive(data: unknown[] | Record<string, unknown>): Record<string, unknown> {
    const archiver = new NsKeyedArchiver()
    return archiver.writeTop(data)
}
