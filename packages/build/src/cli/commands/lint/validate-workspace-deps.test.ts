import type { WorkspacePackage } from '../../../package-json/collect-package-jsons.js'
import type { PackageJson } from '../../../package-json/types.js'

import { describe, expect, it } from 'vitest'

import { validateWorkspaceDeps } from './validate-workspace-deps.js'

function workspacePackage(json: PackageJson, extras: Partial<WorkspacePackage> = {}): WorkspacePackage {
  return {
    path: extras.path ?? `/tmp/${json.name ?? 'pkg'}`,
    packageJsonPath: extras.packageJsonPath ?? `/tmp/${json.name ?? 'pkg'}/package.json`,
    root: extras.root ?? false,
    json,
  }
}

describe('validateWorkspaceDeps', () => {
  it('should validate a workspace with no mismatches', async () => {
    const errors = await validateWorkspaceDeps({ workspaceRoot: new URL('../../../__fixtures__/workspace', import.meta.url) })

    expect(errors).toHaveLength(0)
  })

  it('should validate a workspace with mismatches', async () => {
    const errors = await validateWorkspaceDeps({ workspaceRoot: new URL('../../../__fixtures__/workspace-external-mismatch', import.meta.url) })

    expect(errors).toHaveLength(1)
    expect(errors[0]).to.deep.oneOf([
      {
        type: 'external',
        package: '@fuman-fixtures/package-b',
        otherPackage: '@fuman-fixtures/package-a',
        dependency: 'chai',
        version: '^2.0.0',
        at: 'dependencies',
        otherVersion: '^1.2.3',
      },
      {
        type: 'external',
        package: '@fuman-fixtures/package-a',
        otherPackage: '@fuman-fixtures/package-b',
        dependency: 'chai',
        version: '^1.2.3',
        at: 'dependencies',
        otherVersion: '^2.0.0',
      },
    ])
  })

  it('treats unknown version strings as compatible only when they are equal', async () => {
    const errors = await validateWorkspaceDeps({
      workspaceRoot: '/tmp/ws',
      packages: [
        workspacePackage({
          name: '@fuman-fixtures/package-a',
          dependencies: { foo: 'latest', bar: 'file:./a', baz: 'git+ssh://git@example.com/a.git' },
        }),
        workspacePackage({
          name: '@fuman-fixtures/package-b',
          dependencies: { foo: 'next', bar: 'file:./b', baz: 'git+ssh://git@example.com/b.git' },
        }),
      ],
    })

    expect(errors.filter(error => error.type === 'external')).toEqual([
      {
        type: 'external',
        package: '@fuman-fixtures/package-b',
        otherPackage: '@fuman-fixtures/package-a',
        dependency: 'foo',
        version: 'next',
        at: 'dependencies',
        otherVersion: 'latest',
      },
      {
        type: 'external',
        package: '@fuman-fixtures/package-b',
        otherPackage: '@fuman-fixtures/package-a',
        dependency: 'bar',
        version: 'file:./b',
        at: 'dependencies',
        otherVersion: 'file:./a',
      },
      {
        type: 'external',
        package: '@fuman-fixtures/package-b',
        otherPackage: '@fuman-fixtures/package-a',
        dependency: 'baz',
        version: 'git+ssh://git@example.com/b.git',
        at: 'dependencies',
        otherVersion: 'git+ssh://git@example.com/a.git',
      },
    ])
  })
})

