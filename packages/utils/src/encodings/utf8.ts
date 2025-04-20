export const encoder: TextEncoder = new TextEncoder()
export const decoder: TextDecoder = new TextDecoder()

// shim for deno
declare const Buffer: typeof import('node:buffer').Buffer

export function encodedLength(str: string): number {
  if (typeof Buffer !== 'undefined') {
    return Buffer.byteLength(str, 'utf8')
  }

  // https://stackoverflow.com/a/23329386
  let s = str.length

  for (let i = str.length - 1; i >= 0; i--) {
    const code = str.charCodeAt(i)
    if (code > 0x7F && code <= 0x7FF) s++
    else if (code > 0x7FF && code <= 0xFFFF) s += 2
    if (code >= 0xDC00 && code <= 0xDFFF) i-- // trail surrogate
  }

  return s
}
