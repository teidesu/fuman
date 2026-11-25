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

  it('parses feat(scope)!: as breaking with a scope', () => {
    expect(parseConventionalCommit('feat(api)!: rename hook context')).toEqual({
      type: 'feat',
      scope: 'api',
      breaking: true,
      subject: 'rename hook context',
    })
  })

  it('marks a commit breaking when the body has a BREAKING CHANGE footer', () => {
    expect(
      parseConventionalCommit('feat: change the release tag schema\n\nBREAKING CHANGE: tags are now vX.Y.Z'),
    ).toEqual({
      type: 'feat',
      breaking: true,
      subject: 'change the release tag schema',
    })
  })

  it('marks a commit breaking when the footer uses BREAKING-CHANGE', () => {
    expect(parseConventionalCommit('fix: align versions\n\nBREAKING-CHANGE: dependents must bump')).toEqual({
      type: 'fix',
      breaking: true,
      subject: 'align versions',
    })
  })

  it('returns null for a non-conventional subject', () => {
    expect(parseConventionalCommit('just a regular commit')).toBeNull()
  })
})
