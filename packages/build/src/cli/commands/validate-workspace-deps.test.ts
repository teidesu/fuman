import { describe, expect, it } from 'vitest'

import { validateWorkspaceDeps } from './validate-workspace-deps.js'

describe('validateWorkspaceDeps', () => {
    it('should validate a workspace with no mismatches', async () => {
        const errors = await validateWorkspaceDeps({ workspaceRoot: new URL('../../__fixtures__/workspace', import.meta.url) })

        expect(errors).toHaveLength(0)
    })

    it('should validate a workspace with mismatches', async () => {
        const errors = await validateWorkspaceDeps({ workspaceRoot: new URL('../../__fixtures__/workspace-external-mismatch', import.meta.url) })

        expect(errors).toHaveLength(1)
        expect(errors[0]).to.deep.oneOf([
            {
                package: '@fuman-fixtures/package-b',
                otherPackage: '@fuman-fixtures/package-a',
                dependency: 'chai',
                version: '^2.0.0',
                at: 'dependencies',
                otherVersion: '^1.2.3',
            },
            {
                package: '@fuman-fixtures/package-a',
                otherPackage: '@fuman-fixtures/package-b',
                dependency: 'chai',
                version: '^1.2.3',
                at: 'dependencies',
                otherVersion: '^2.0.0',
            },
        ])
    })
})
