import type { FfetchOptions } from '../ffetch.js'

export function urlencode(query: Record<string, unknown>): URLSearchParams {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (value == null) continue

    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        search.append(key, String(value[i]))
      }
    } else {
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
      // remove the header
      for (let i = 0; i < headers.length; i++) {
        if (headers[i][0] === key) {
          headers.splice(i, 1)
          i -= 1
          break
        }
      }
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
