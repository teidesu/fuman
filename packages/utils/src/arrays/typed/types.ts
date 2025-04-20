import type { AnyToNever } from '../../types/misc.js'

export type TypedArray =
  | Uint8Array
  | Uint16Array
  | Uint32Array
  | Int8Array
  | Int16Array
  | Int32Array
  | Float32Array
  | Float64Array
    // BigInt64Array and BigUint64Array might not be available in some environments
  | AnyToNever<BigInt64Array>
  | AnyToNever<BigUint64Array>
