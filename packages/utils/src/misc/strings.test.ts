import { describe, expect, it } from 'vitest'

import { splitOnce } from './strings.js'

describe('splitOnce', () => {
  it('should split a string once', () => {
    expect(splitOnce('hello world', ' ')).toEqual(['hello', 'world'])
    expect(splitOnce('hello world and everyone', ' ')).toEqual(['hello', 'world and everyone'])
  })

  it('should throw if the separator is not found', () => {
    expect(() => splitOnce('hello world', '!')).toThrow('Separator not found: !')
  })
})
