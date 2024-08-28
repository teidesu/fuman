import { describe, expect, it } from 'vitest'

import { collectPackageJsons } from './collect-package-jsons.js'

describe('collectPackageJsons', () => {
    it('should collect package.jsons from a workspace', async () => {
        const packageJsons = await collectPackageJsons(new URL('../__fixtures__/workspace', import.meta.url))

        const names = packageJsons.map(pj => pj.json.name)
        // glob might return them in a different order
        expect(names).toContainEqual('@fuman-fixtures/package-a')
        expect(names).toContainEqual('@fuman-fixtures/package-b')
        expect(names).toHaveLength(2)
    })

    it('should collect package.jsons from a pnpm workspace', async () => {
        const packageJsons = await collectPackageJsons(new URL('../__fixtures__/pnpm-workspace', import.meta.url))

        const names = packageJsons.map(pj => pj.json.name)
        // glob might return them in a different order
        expect(names).toContainEqual('@fuman-fixtures/package-a')
        expect(names).toContainEqual('@fuman-fixtures/package-b')
        expect(names).toHaveLength(2)
    })

    it('should include the root package.json if requested', async () => {
        const packageJsons = await collectPackageJsons(new URL('../__fixtures__/workspace', import.meta.url), true)

        const names = packageJsons.map(pj => pj.json.name)
        // glob might return them in a different order
        expect(names).toContainEqual('@fuman-fixtures/package-a')
        expect(names).toContainEqual('@fuman-fixtures/package-b')
        expect(names).toContainEqual('@fuman-fixtures/workspace')
        expect(names).toHaveLength(3)
    })

    it('should throw if no workspaces are found', async () => {
        await expect(collectPackageJsons(new URL('../__fixtures__/workspace/packages/package-a', import.meta.url))).rejects.toThrow('No workspaces found in package.json')
    })
})
