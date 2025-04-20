import { describe, expect, it } from 'vitest'

import { parseConventionalCommit } from './utils.js'

describe('parseConventionalCommit', () => {
  it('should parse a conventional commit', () => {
    expect(parseConventionalCommit('feat(scope): subject')).toEqual({
      type: 'feat',
      scope: 'scope',
      breaking: false,
      subject: 'subject',
    })
  })

  it('should parse a breaking conventional commit', () => {
    expect(parseConventionalCommit('feat!: subject')).toEqual({
      type: 'feat',
      breaking: true,
      subject: 'subject',
    })
  })
})
