export interface PlistValueType {
  float32: number
  float64: number
  int: number | bigint
  uid: number | bigint
  ascii: string
  utf16: string
  utf8: string
}

export class PlistValue<Type extends keyof PlistValueType = keyof PlistValueType> {
  constructor(
    public readonly type: Type,
    public readonly value: PlistValueType[Type],
  ) {}

  valueOf(): PlistValueType[Type] {
    return this.value
  }

  toString(): string {
    return String(this.value)
  }
}

export interface KeyedArchiverValueHeader {
  $classname: string
  $classes: string[]
  $classhints?: string[]
}

export class KeyedArchiverValue {
  constructor(
    public readonly header: KeyedArchiverValueHeader,
    public readonly value: unknown,
  ) {}

  valueOf(): unknown {
    return this.value
  }
}
