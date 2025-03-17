import { read } from '@fuman/io'
import { typed, unreachable, utf8 } from '@fuman/utils'
import { BPLIST_MAGIC, CORE_DATA_EPOCH, MAX_OBJECT_COUNT } from './_constants.js'
import { PlistValue } from './types.js'
import { safeToNumber } from './_utils.js'

const UINT_SIZES = new Uint8Array([1, 2, 4, 8])

export function readBinaryPlist(data: Uint8Array, options?: {
    /**
     *  maximum number of objects to read
     * @default 1024 * 1024
     */
    maxObjectCount?: number
    /** when true, the magic check will be skipped */
    skipMagicCheck?: boolean
    /**
     * when true, some primitive values will be wrapped into {@link PlistValueType} to allow for lossless operation
     * otherwise, only `uid*` values will be wrapped
     */
    preserveType?: boolean
}): unknown {
    const {
        maxObjectCount = MAX_OBJECT_COUNT,
        skipMagicCheck = false,
        preserveType = false,
    } = options ?? {}
    if (data.length < 38) {
        throw new Error('bplist is too small')
    }

    const magic = data.subarray(0, 6)
    if (!skipMagicCheck && !typed.equal(magic, BPLIST_MAGIC)) {
        throw new Error(`bplist magic is invalid: ${utf8.decoder.decode(magic)}`)
    }

    const trailer = data.subarray(-32)

    const offsetSize = trailer[6]
    const objectRefSize = trailer[7]

    const numObjects = safeToNumber(read.uint64be(trailer.subarray(8, 16)))
    const topObject = safeToNumber(read.uint64be(trailer.subarray(16, 24)))
    const offsetTableOffset = safeToNumber(read.uint64be(trailer.subarray(24, 32)))

    if (numObjects > maxObjectCount) {
        throw new Error('MAX_OBJECT_COUNT exceeded')
    }

    function checkBounds(offset: number) {
        if (offset >= data.length) {
            throw new Error(`out of bounds: offset ${offset} >= ${data.length}`)
        }
    }

    function readUint(offset: number, size: number): number | bigint {
        switch (size) {
            case 1: {
                checkBounds(offset)
                return data[offset]
            }
            case 2: return read.uint16be(data.subarray(offset, offset + 2))
            case 4: return read.uint32be(data.subarray(offset, offset + 4))
            case 8: return read.uint64be(data.subarray(offset, offset + 8))
            default: throw new Error(`invalid int size: ${size}`)
        }
    }

    const readNumber = (offset: number, size: number) => safeToNumber(readUint(offset, size))

    const offsetTable: number[] = []
    for (let i = 0, offset = offsetTableOffset; i < numObjects; i++, offset += offsetSize) {
        offsetTable[i] = readNumber(offset, offsetSize)
    }

    function readBytes(offset: number, size: number, isUtf16 = false): Uint8Array {
        if (size === 0b1111) {
            const intSize = UINT_SIZES[data[offset + 1] & 0xF]
            size = readNumber(offset + 2, intSize)
            offset += 1 + intSize
        }
        if (isUtf16) size *= 2
        checkBounds(offset + 1 + size)
        return data.subarray(offset + 1, offset + 1 + size)
    }

    function readObject(ref: number): unknown {
        const offset = offsetTable[ref]
        if (!offset) throw new Error(`object ${ref} not found`)
        checkBounds(offset)

        const type = data[offset]
        const low = type & 0xF
        const high = (type >> 4) & 0xF

        switch (high) {
            case 0b0000:
                switch (low) {
                    case 0b0000: return null
                    case 0b1000: return false
                    case 0b1001: return true
                    case 0b1111: return undefined // padding
                    default: throw new Error(`invalid type 0b${type.toString(2)}`)
                }
            case 0b0001: { // int, low is size
                let int: number | bigint
                switch (low) {
                    case 0: int = data[offset + 1]; break
                    case 1: int = read.uint16be(data.subarray(offset + 1, offset + 3)); break
                    case 2: int = read.uint32be(data.subarray(offset + 1, offset + 7)); break
                    case 3: int = read.int64be(data.subarray(offset + 1, offset + 9)); break
                    case 4: int = read.intbe(data.subarray(offset + 1, offset + 17), 16); break
                    default: throw new Error(`invalid type 0b${type.toString(2)}`)
                }
                return preserveType ? new PlistValue('int', int) : int
            }
            case 0b0010: { // real, low is size
                let float
                switch (low) {
                    case 0b0010: float = read.float32be(data.subarray(offset + 1)); break
                    case 0b0011: float = read.float64be(data.subarray(offset + 1)); break
                    default: throw new Error(`invalid type 0b${type.toString(2)}`)
                }

                return preserveType ? new PlistValue(low === 0b0010 ? 'float32' : 'float64', float) : float
            }
            case 0b0011: { // date, low must be 0b0011
                if (low !== 0b0011) throw new Error(`invalid type 0b${type.toString(2)}`)
                const seconds = read.float64be(data.subarray(offset + 1))
                return new Date(CORE_DATA_EPOCH + seconds * 1000)
            }
            case 0b0100: // data, low is size
                return readBytes(offset, low)
            case 0b0101: { // ascii string, low is size
                const bytes = readBytes(offset, low)
                let str = ''
                for (let i = 0; i < bytes.length; i++) {
                    const char = bytes[i]
                    if (char === 0) break
                    str += String.fromCharCode(char)
                }
                return preserveType ? new PlistValue('ascii', str) : str
            }
            case 0b0110: { // utf16 string, low is size
                const bytes = readBytes(offset, low, true)
                const str = read.utf16beString(bytes, bytes.length)
                return preserveType ? new PlistValue('utf16', str) : str
            }
            case 0b0111: { // utf8 string, low is size
                const str = utf8.decoder.decode(readBytes(offset, low))
                return preserveType ? new PlistValue('utf8', str) : str
            }
            case 0b1000: { // UID
                const int = readUint(offset + 1, UINT_SIZES[low])
                return new PlistValue('uid', int)
            }
            case 0b1010: // array-like
            case 0b1011: {
                const array: unknown[] = []
                let arraySize = low
                let arrayOffset = offset + 1
                if (arraySize === 0b1111) {
                    const intSize = UINT_SIZES[data[offset + 1] & 0xF]
                    arraySize = readNumber(offset + 2, intSize)
                    arrayOffset += 1 + intSize
                }

                checkBounds(arrayOffset + arraySize * objectRefSize)

                for (let i = 0, offset = arrayOffset; i < arraySize; i++, offset += objectRefSize) {
                    array[i] = readObject(readNumber(offset, objectRefSize))
                }

                switch (high) {
                    case 0b1010: return array
                    case 0b1011: return new Set(array)
                    default: return unreachable()
                }
            }
            case 0b1101: { // dictionary
                const dict: Record<string | number, unknown> = {}
                let dictSize = low
                let keysOffset = offset + 1
                if (dictSize === 0b1111) {
                    const intSize = UINT_SIZES[data[offset + 1] & 0xF]
                    dictSize = readNumber(offset + 2, intSize)
                    keysOffset += 1 + intSize
                }

                const valuesOffset = keysOffset + objectRefSize * dictSize

                checkBounds(valuesOffset + dictSize * objectRefSize)

                for (
                    let i = 0, keyOffset = keysOffset, valueOffset = valuesOffset;
                    i < dictSize;
                    i++, keyOffset += objectRefSize, valueOffset += objectRefSize
                ) {
                    let key = readObject(readNumber(keyOffset, objectRefSize))
                    if (preserveType && key instanceof PlistValue) {
                        key = key.valueOf()
                    }
                    if (typeof key !== 'string' && typeof key !== 'number') {
                        throw new TypeError(`invalid key: ${key}`)
                    }
                    const value = readObject(readNumber(valueOffset, objectRefSize))
                    dict[key] = value
                }

                return dict
            }
            default: throw new Error(`invalid type 0b${type.toString(2)}`)
        }
    }

    return readObject(topObject)
}
