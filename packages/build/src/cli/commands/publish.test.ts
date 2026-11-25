import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

import { formatNpmAuthRc, normalizeNpmAuthToken, prepareNpmPublishAuth } from './publish.js'

describe('normalizeNpmAuthToken', () => {
  it('returns undefined for a missing or blank token', () => {
    expect(normalizeNpmAuthToken()).toBeUndefined()
    expect(normalizeNpmAuthToken('')).toBeUndefined()
    expect(normalizeNpmAuthToken('   ')).toBeUndefined()
  })

  it('returns the trimmed token when it is non-empty', () => {
    expect(normalizeNpmAuthToken('secret')).toBe('secret')
    expect(normalizeNpmAuthToken('  secret  ')).toBe('secret')
  })
})

describe('formatNpmAuthRc', () => {
  it('writes a registry auth line without touching the global config', () => {
    expect(formatNpmAuthRc('https://registry.npmjs.org', 'secret-token')).toBe(
      '//registry.npmjs.org/:_authToken=secret-token\n',
    )
  })
})

describe('prepareNpmPublishAuth', () => {
  it('does not write a config file for a missing or blank token', async () => {
    for (const token of [undefined, '', '   ']) {
      const auth = await prepareNpmPublishAuth({ token, registryUrl: 'https://registry.npmjs.org' })
      expect(auth.extraArgs).toEqual([])
      expect(auth.extraEnv).toEqual({})
      expect(auth.extraArgs).not.toContain('--global')
      await auth.cleanup()
    }
  })

  it('writes a temporary userconfig and never uses --global', async () => {
    const auth = await prepareNpmPublishAuth({
      token: 'secret-token',
      registryUrl: 'https://registry.npmjs.org',
    })
    const npmrcPath = auth.extraArgs[1]

    try {
      expect(auth.extraArgs).toEqual(['--userconfig', npmrcPath])
      expect(auth.extraArgs).not.toContain('--global')
      expect(auth.extraArgs).not.toContain('config')
      expect(auth.extraEnv).toEqual({
        NPM_TOKEN: 'secret-token',
        NODE_AUTH_TOKEN: 'secret-token',
      })
      expect(await readFile(npmrcPath, 'utf8')).toBe('//registry.npmjs.org/:_authToken=secret-token\n')
    } finally {
      await auth.cleanup()
    }

    await expect(readFile(npmrcPath, 'utf8')).rejects.toThrow()
  })
})
