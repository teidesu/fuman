export function safeToNumber(value: number | bigint): number {
  if (typeof value === 'bigint') {
    if (value > Number.MAX_SAFE_INTEGER) {
      throw new Error(`value is too large: ${value}`)
    }
    return Number(value)
  }
  return value
}
