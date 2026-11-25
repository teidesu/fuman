import { describe, expect, it } from 'vitest'

import { unknownToError } from './error.js'

describe('unknownToError', () => {
  it('should keep the error if it is already an error', () => {
    const err = new Error('test')
    expect(unknownToError(err)).toBe(err)
  })

  it('for strings, should use it as the error message', () => {
    expect(unknownToError('test')).toBeInstanceOf(Error)
    expect(unknownToError('test')).toHaveProperty('message', 'test')
  })

  it('for objects, should use JSON as the error message', () => {
    expect(unknownToError({ message: 'test' })).toBeInstanceOf(Error)
    expect(unknownToError({ message: 'test' })).toHaveProperty('message', '{"message":"test"}')
  })

  it('should keep a circular object as cause', () => {
    const circular: { self: unknown } = { self: null }
    circular.self = circular
    const err = unknownToError(circular)

    expect(err).toBeInstanceOf(Error)
    expect(err.cause).toBe(circular)
  })

  it('should keep a bigint as cause', () => {
    const err = unknownToError(1n)

    expect(err).toBeInstanceOf(Error)
    expect(err.cause).toBe(1n)
  })
})
