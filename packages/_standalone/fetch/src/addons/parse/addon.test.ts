import { describe, expect, it } from 'vitest'

import { SchemaValidationError } from './addon.js'

describe('SchemaValidationError', () => {
  it('should use a stable name and base message when there are no issues', () => {
    const err = new SchemaValidationError([])
    expect(err.name).toBe('SchemaValidationError')
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toBe('Schema validation failed')
    expect(err.issues).toEqual([])
  })

  it('should append issue messages without a path', () => {
    const err = new SchemaValidationError([{ message: 'required' }])
    expect(err.message).toBe('Schema validation failed: required')
  })

  it('should format path segments and skip an empty path', () => {
    const err = new SchemaValidationError([
      { message: 'bad', path: ['user', { key: 'age' }] },
      { message: 'also', path: [] },
    ])
    expect(err.message).toBe('Schema validation failed: bad at .user.age: also')
  })
})
