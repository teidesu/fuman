import type { CommitInfo } from '../git/utils.js'

import { describe, expect, it } from 'vitest'

import { determineBumpType } from './bump-version.js'

function commit(message: string, description = ''): CommitInfo {
  return {
    hash: 'abc123',
    author: { name: 'Test', email: 'test@example.com', date: new Date(0) },
    committer: { name: 'Test', email: 'test@example.com', date: new Date(0) },
    message,
    description,
  }
}

describe('determineBumpType', () => {
  it('treats a BREAKING CHANGE footer on 0.1.0 as a breaking (minor) bump', () => {
    expect(determineBumpType({
      oldVersion: '0.1.0',
      commits: [commit('feat: change the release tag schema', 'BREAKING CHANGE: tags are now vX.Y.Z')],
    })).toBe('minor')
  })

  it('treats a BREAKING-CHANGE footer on 1.0.0 as a major bump', () => {
    expect(determineBumpType({
      oldVersion: '1.0.0',
      commits: [commit('fix: align versions', 'BREAKING-CHANGE: dependents must bump')],
    })).toBe('major')
  })

  it('stays a patch when a feat on 0.x has no breaking footer', () => {
    expect(determineBumpType({
      oldVersion: '0.1.0',
      commits: [commit('feat: add a thing')],
    })).toBe('patch')
  })
})
