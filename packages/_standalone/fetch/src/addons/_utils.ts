import type { FfetchOptions } from '../ffetch.js'

export function urlencode(query: Record<string, unknown>): URLSearchParams {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (value == null) continue

    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        if (value[i] != null) search.append(key, String(value[i]))
      }
    } else if (typeof value !== 'object' && typeof value !== 'function') {
      search.set(key, String(value))
    }
  }

  return search
}

export function setHeader(options: FfetchOptions, key: string, value: string | null): void {
  if (!options.headers) {
    if (value === null) return
    options.headers = { [key]: value }
    return
  }

  let { headers } = options
  if (Array.isArray(headers)) {
    if (value === null) {
      options.headers = headers.filter(([k]) => k !== key)
      return
    }

    headers.push([key, value])
    return
  } else if (headers instanceof Headers) {
    if (value === null) {
      headers.delete(key)
    } else {
      headers.set(key, value)
    }
    return
  }

  if (Symbol.iterator in headers) {
    // Iterable<string[]>
    headers = options.headers = Object.fromEntries(headers as Iterable<string[]>) as Record<string, string>
  }

  if (value === null) {
    delete (headers as Record<string, string>)[key]
  } else {
    (headers as Record<string, string>)[key] = value
  }
}
