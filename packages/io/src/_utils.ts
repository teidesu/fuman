export function nextPowerOfTwo(n: number): number {
  n--
  n |= n >> 1
  n |= n >> 2
  n |= n >> 4
  n |= n >> 8
  n |= n >> 16
  return n + 1
}

const dvCache = new WeakMap<ArrayBuffer, DataView>()

export function getDv(buffer: Uint8Array): DataView {
  const ab = buffer.buffer as ArrayBuffer
  let dv = dvCache.get(ab)
  if (!dv) {
    dv = new DataView(ab)
    dvCache.set(ab, dv)
  }
  return dv
}
