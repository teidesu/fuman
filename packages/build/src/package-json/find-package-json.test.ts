import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { findPackageJson } from './find-package-json.js'

describe('findPackageJson', () => {
  it('should find the closest package.json', async () => {
    const file = await findPackageJson(new URL('../__fixtures__/workspace/packages/package-a/src/index.ts', import.meta.url))
    expect(file).toBeTruthy()
    expect(file).toEqual(fileURLToPath(new URL('../__fixtures__/workspace/packages/package-a/package.json', import.meta.url)))
  })

  it('should return null if not found', async () => {
    const file = await findPackageJson('/')
    expect(file).toBeNull()
  })
})
