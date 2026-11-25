import type { FfetchOptions } from '../ffetch.js'
import { describe, expect, it } from 'vitest'

import { setHeader, urlencode } from './_utils.js'

describe('urlencode', () => {
  it('should skip null, undefined, objects and functions', () => {
    const params = urlencode({
      a: null,
      b: undefined,
      c: 42,
      d: { nested: true },
      e: () => {},
      f: 'hello',
      g: true,
    })
    expect([...params.entries()]).toEqual([
      ['c', '42'],
      ['f', 'hello'],
      ['g', 'true'],
    ])
  })

  it('should skip nullish array entries', () => {
    const params = urlencode({ tags: ['a', null, 'b', undefined, 123] })
    expect([...params.entries()]).toEqual([
      ['tags', 'a'],
      ['tags', 'b'],
      ['tags', '123'],
    ])
  })
})

describe('setHeader', () => {
  it('should delete every matching key from an array of tuples', () => {
    const options: FfetchOptions = {
      headers: [['X-A', '1'], ['X-A', '2'], ['X-B', '3']],
    }
    setHeader(options, 'X-A', null)
    expect(options.headers).toEqual([['X-B', '3']])
  })
})
