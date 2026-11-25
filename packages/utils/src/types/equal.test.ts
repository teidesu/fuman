import { describe, expect, it } from 'vitest'

import type { TypesEqual } from './equal.js'

describe('TypesEqual', () => {
  it('should be true for identical types', () => {
    const same: TypesEqual<number, number> = true
    expect(same).toBe(true)
  })

  it('should treat any as not equal to number', () => {
    type Result = TypesEqual<any, number>
    const isFalse: Result extends false ? true : false = true
    expect(isFalse).toBe(true)
  })
})
