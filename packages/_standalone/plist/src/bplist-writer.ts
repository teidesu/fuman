/* eslint-disable ts/unbound-method, ts/no-unsafe-assignment, ts/no-unsafe-argument */
import { Bytes, write } from '@fuman/io'
import { BPLIST_MAGIC, CORE_DATA_EPOCH, MAX_OBJECT_COUNT } from './_constants.js'
import { PlistValue } from './types.js'

type PlistEntry
  = | { id: number, type: 'string', value: string, format: 'ascii' | 'utf16' | 'utf8' }
    | { id: number, type: 'int', value: number | bigint, size: number }
    | { id: number, type: 'uid', value: number, size: number }
    | { id: number, type: 'bool', value: boolean }
    | { id: number, type: 'real', value: number, size: number }
    | { id: number, type: 'date', value: Date }
    | { id: number, type: 'data', value: Uint8Array }
    | { id: number, type: 'array', items: PlistEntry[] }
    | { id: number, type: 'set', items: PlistEntry[] }
    | { id: number, type: 'dict', entries: { key: PlistEntry, value: PlistEntry }[] }
    | { id: number, type: 'null' }
    | number // a reference to a previously written entry

function determineUintSize(value: number | bigint): number {
  if (value < 0) {
    throw new Error(`unexpected negative value: ${value}`)
  }
  if (value < 256) {
    return 1
  }
  if (value < 65536) {
    return 2
  }
  if (value < 4294967296) {
    return 4
  }
  return 8
}

function writeUint(bytes: Bytes, value: number | bigint, size: number): void {
  switch (size) {
    case 1: write.uint8(bytes, value as number); break
    case 2: write.uint16be(bytes, value as number); break
    case 4: write.uint32be(bytes, value as number); break
    case 8: write.uint64be(bytes, value as bigint); break
    default: throw new Error(`invalid uint size: ${size}`)
  }
}

function writeUintWithHeader(bytes: Bytes, value: number | bigint, type = 0b0001_0000): void {
  const size = determineUintSize(value)
  let headerSize: number
  if (size === 1) headerSize = 0
  else if (size === 2) headerSize = 1
  else if (size === 4) headerSize = 2
  else headerSize = 3
  write.uint8(bytes, type | headerSize)
  writeUint(bytes, value, size)
}

function writeSizeHeader(bytes: Bytes, type: number, size: number): void {
  if (size < 0b1111) {
    write.uint8(bytes, type | size)
  } else {
    write.uint8(bytes, type | 0b1111)
    writeUintWithHeader(bytes, size)
  }
}

function isAscii(value: string): boolean {
  // eslint-disable-next-line no-control-regex
  return /^[\x00-\x7F]*$/.test(value)
}

const INT32_MAX = 2 ** 31 - 1
const INT64_MAX = 2n ** 63n - 1n
const INT64_MIN = -(2n ** 63n)
const INT128_MAX = 2n ** 127n - 1n
const INT128_MIN = -(2n ** 127n)

function handleInt(id: number, value: number | bigint): PlistEntry {
  if (value < 0 || value > INT32_MAX) {
    // int32 and below are unsigned, so we need to use at least int64.
    // also verify that the value fits in 32 bits, otherwise cast it to bigint
    value = BigInt(value)
  }

  if (typeof value === 'number') {
    return { id, type: 'int', value, size: determineUintSize(value) }
  }

  const value_ = value as bigint // ts is dumb lol

  if (value_ < INT64_MIN || value_ > INT64_MAX) {
    // we must use int128
    if (value_ < INT128_MIN || value_ > INT128_MAX) {
      throw new Error(`value is too large: ${value_}`)
    }

    return {
      id,
      type: 'int',
      value: value_,
      size: 16,
    }
  }

  return {
    id,
    type: 'int',
    value: value_,
    size: 8,
  }
}

class BinaryPlistWriter {
  #nextId = 0
  #values = new Map<unknown, number>()
  constructor() {
    this.toPlistEntry = this.toPlistEntry.bind(this)
  }

  toPlistEntry(value: unknown): PlistEntry {
    switch (typeof value) {
      case 'string': {
        const existingId = this.#values.get(value)
        if (existingId !== undefined) {
          return existingId
        }

        const id = this.#nextId++
        this.#values.set(value, id)

        return {
          id,
          type: 'string',
          value,
          format: isAscii(value) ? 'ascii' : 'utf16',
        }
      }
      case 'number':
      case 'bigint': {
        const existingId = this.#values.get(value)
        if (existingId !== undefined) {
          return existingId
        }

        const id = this.#nextId++
        this.#values.set(value, id)

        if (typeof value === 'number') {
          // is this a float?
          if (value % 1 !== 0) {
            return { id, type: 'real', value, size: 8 }
          }
        }

        return handleInt(id, value)
      }
      case 'boolean': {
        const existingId = this.#values.get(value)
        if (existingId !== undefined) {
          return existingId
        }
        const id = this.#nextId++
        this.#values.set(value, id)
        return { id, type: 'bool', value }
      }
      case 'object': {
        if (value === null) {
          const existingId = this.#values.get(value)
          if (existingId !== undefined) {
            return existingId
          }
          const id = this.#nextId++
          this.#values.set(value, id)
          return { id, type: 'null' }
        }

        const id = this.#nextId++
        if (value instanceof Date) return { id, type: 'date', value }
        if (value instanceof Uint8Array) return { id, type: 'data', value }
        if (Array.isArray(value)) return { id, type: 'array', items: value.map(this.toPlistEntry) }
        if (value instanceof Set) return { id, type: 'set', items: Array.from(value).map(this.toPlistEntry) }

        if (value instanceof PlistValue) {
          switch (value.type) {
            case 'float32': return { id, type: 'real', value: value.value, size: 4 }
            case 'float64': return { id, type: 'real', value: value.value, size: 8 }
            case 'int': return handleInt(id, value.value)
            case 'uid': return { id, type: 'uid', value: value.value, size: determineUintSize(value.value) }
            case 'ascii': return { id, type: 'string', value: value.value, format: 'ascii' }
            case 'utf16': return { id, type: 'string', value: value.value, format: 'utf16' }
            case 'utf8': return { id, type: 'string', value: value.value, format: 'utf8' }
            default: throw new Error(`unsupported plist value type: ${value.type}`)
          }
        }

        // plain object (or Map)
        const objEntries = value instanceof Map ? Array.from(value.entries()) : Object.entries(value)
        const entries: { key: PlistEntry, value: PlistEntry }[] = []
        for (let i = 0; i < objEntries.length; i++) {
          const [key, value] = objEntries[i]
          entries.push({ key: this.toPlistEntry(key), value: this.toPlistEntry(value) })
        }
        return { id: this.#nextId++, type: 'dict', entries }
      }
      default: throw new Error(`unexpected value type: ${typeof value}`)
    }
  }

  #offsetTable!: number[]
  #objectRefSize!: number
  writeRef(bytes: Bytes, id: number): void {
    writeUint(bytes, id, this.#objectRefSize)
  }

  writeEntry(bytes: Bytes, entry: PlistEntry): number {
    if (typeof entry === 'number') return entry // already written

    switch (entry.type) {
      case 'null':
        this.#offsetTable[entry.id] = bytes.written
        write.uint8(bytes, 0b0000_0000)
        break
      case 'bool':
        this.#offsetTable[entry.id] = bytes.written
        write.uint8(bytes, entry.value ? 0b0000_1001 : 0b0000_1000)
        break
      case 'int': {
        this.#offsetTable[entry.id] = bytes.written
        switch (entry.size) {
          case 1: {
            write.uint8(bytes, 0b0001_0000)
            write.uint8(bytes, entry.value as number)
            break
          }
          case 2: {
            write.uint8(bytes, 0b0001_0001)
            write.uint16be(bytes, entry.value as number)
            break
          }
          case 4: {
            write.uint8(bytes, 0b0001_0010)
            write.uint32be(bytes, entry.value as number)
            break
          }
          case 8: {
            write.uint8(bytes, 0b0001_0011)
            write.int64be(bytes, entry.value as bigint)
            break
          }
          case 16: {
            write.uint8(bytes, 0b0001_0100)
            write.intbe(bytes, 16, entry.value as bigint)
            break
          }
          default: throw new Error(`invalid int size: ${entry.size}`)
        }
        break
      }
      case 'real': {
        this.#offsetTable[entry.id] = bytes.written
        switch (entry.size) {
          case 4: {
            write.uint8(bytes, 0b0010_0010)
            write.float32be(bytes, entry.value as number)
            break
          }
          case 8: {
            write.uint8(bytes, 0b0010_0011)
            write.float64be(bytes, entry.value as number)
            break
          }
          default: throw new Error(`invalid real size: ${entry.size}`)
        }
        break
      }
      case 'date': {
        this.#offsetTable[entry.id] = bytes.written
        write.uint8(bytes, 0b0011_0011)
        const seconds = (entry.value.getTime() - CORE_DATA_EPOCH) / 1000
        write.float64be(bytes, seconds)
        break
      }
      case 'data':
        this.#offsetTable[entry.id] = bytes.written
        writeSizeHeader(bytes, 0b0100_0000, entry.value.length)
        write.bytes(bytes, entry.value)
        break
      case 'string': {
        this.#offsetTable[entry.id] = bytes.written
        switch (entry.format) {
          case 'ascii':
            writeSizeHeader(bytes, 0b0101_0000, entry.value.length)
            write.rawString(bytes, entry.value)
            break
          case 'utf16':
            writeSizeHeader(bytes, 0b0110_0000, entry.value.length)
            write.utf16beString(bytes, entry.value)
            break
          case 'utf8':
            writeSizeHeader(bytes, 0b0111_0000, entry.value.length)
            write.utf8String(bytes, entry.value)
            break
          default: throw new Error(`invalid string format: ${entry.format as string}`)
        }
        break
      }
      case 'uid':
        this.#offsetTable[entry.id] = bytes.written
        writeUintWithHeader(bytes, entry.value, 0b1000_0000)
        break
      case 'array':
      case 'set': {
        const type = entry.type === 'array' ? 0b1010_0000 : 0b1011_0000

        const refs: number[] = []
        for (const item of entry.items) {
          refs.push(this.writeEntry(bytes, item))
        }

        this.#offsetTable[entry.id] = bytes.written
        writeSizeHeader(bytes, type, refs.length)
        refs.forEach(ref => this.writeRef(bytes, ref))
        break
      }
      case 'dict': {
        const keyRefs: number[] = []
        const valueRefs: number[] = []

        for (const { key, value } of entry.entries) {
          keyRefs.push(this.writeEntry(bytes, key))
          valueRefs.push(this.writeEntry(bytes, value))
        }

        this.#offsetTable[entry.id] = bytes.written
        writeSizeHeader(bytes, 0b1101_0000, entry.entries.length)
        keyRefs.forEach(ref => this.writeRef(bytes, ref))
        valueRefs.forEach(ref => this.writeRef(bytes, ref))
        break
      }
    }

    return entry.id
  }

  writeTop(data: unknown): Uint8Array {
    const topEntry = this.toPlistEntry(data)

    const numObjects = this.#nextId
    if (numObjects > MAX_OBJECT_COUNT) {
      throw new Error('MAX_OBJECT_COUNT exceeded')
    }

    this.#objectRefSize = determineUintSize(numObjects)
    this.#offsetTable = Array.from({ length: numObjects })

    const bytes = Bytes.alloc()
    write.bytes(bytes, BPLIST_MAGIC)
    write.int16be(bytes, 0x3030) // version

    this.writeEntry(bytes, topEntry)

    // write offset table and trailer
    const offsetTableOffset = bytes.written
    const offsetSize = determineUintSize(bytes.written)
    for (let i = 0; i < this.#offsetTable.length; i++) {
      writeUint(bytes, this.#offsetTable[i], offsetSize)
    }

    write.bytes(bytes, new Uint8Array([0, 0, 0, 0, 0, 0]))
    write.uint8(bytes, offsetSize)
    write.uint8(bytes, this.#objectRefSize)
    write.uint64be(bytes, BigInt(numObjects))
    write.uint64be(bytes, BigInt((topEntry as { id: number }).id))
    write.uint64be(bytes, BigInt(offsetTableOffset))

    return bytes.result()
  }
}

export function writeBinaryPlist(data: unknown): Uint8Array {
  return new BinaryPlistWriter().writeTop(data)
}
