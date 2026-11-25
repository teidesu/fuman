import type { WorkspacePackage } from '../../package-json/collect-package-jsons.js'
import type { PackageJson } from '../../package-json/types.js'

import { resolve } from 'node:path'
import process from 'node:process'
import { describe, expect, it } from 'vitest'

import { runContinuousReleaseCli, selectChangedNpmPackages } from './cr.js'

function workspacePackage(json: PackageJson, extras: Partial<WorkspacePackage> = {}): WorkspacePackage {
  return {
    path: extras.path ?? `/tmp/${json.name ?? 'pkg'}`,
    packageJsonPath: extras.packageJsonPath ?? `/tmp/${json.name ?? 'pkg'}/package.json`,
    root: extras.root ?? false,
    json,
  }
}

describe('runContinuousReleaseCli', () => {
  it('maps --root onto workspaceRoot for the handler', () => {
    const mapped = runContinuousReleaseCli.transform({
      root: '/tmp/ws',
      extraArgs: '--foo',
      onlyChanged: false,
    })

    expect(mapped.workspaceRoot).toBe('/tmp/ws')
    expect(mapped.extraArgs).toEqual(['--foo'])
  })

  it('defaults workspaceRoot to cwd when --root is omitted', () => {
    const mapped = runContinuousReleaseCli.transform({
      onlyChanged: false,
    })

    expect(mapped.workspaceRoot).toBe(process.cwd())
  })

  it('resolves a relative --root against cwd', () => {
    const mapped = runContinuousReleaseCli.transform({
      root: 'packages/build',
      onlyChanged: false,
    })

    expect(mapped.workspaceRoot).toBe(resolve(process.cwd(), 'packages/build'))
  })
})

describe('selectChangedNpmPackages', () => {
  const utils = workspacePackage({ name: '@fuman/utils', version: '0.1.0' })
  const io = workspacePackage({
    name: '@fuman/io',
    version: '0.1.0',
    dependencies: { '@fuman/utils': 'workspace:^' },
  })
  const secret = workspacePackage({
    name: '@fuman/secret',
    version: '0.1.0',
    fuman: { private: true },
  })
  const npmSkip = workspacePackage({
    name: '@fuman/docs-site',
    version: '0.1.0',
    fuman: { npm: 'skip' },
    dependencies: { '@fuman/utils': 'workspace:^' },
  })
  const jsrOnly = workspacePackage({
    name: '@fuman/types',
    version: '0.1.0',
    fuman: { jsr: 'only' },
  })
  const publishable = [utils, io]

  it('keeps a publishable changed package', () => {
    expect(selectChangedNpmPackages({ publishable: [utils], changed: [utils] }).map(pkg => pkg.json.name)).toEqual([
      '@fuman/utils',
    ])
  })

  it('drops private, npm skip, and jsr-only packages even when they changed', () => {
    const selected = selectChangedNpmPackages({
      publishable,
      changed: [secret, npmSkip, jsrOnly],
    })
    expect(selected).toEqual([])
  })

  it('includes publishable dependents of a changed package', () => {
    const withDependent = selectChangedNpmPackages({
      publishable,
      changed: [utils],
    })
    expect(withDependent.map(pkg => pkg.json.name).sort()).toEqual(['@fuman/io', '@fuman/utils'])
  })

  it('does not hand a skipped dependent to pkg-pr-new', () => {
    const selected = selectChangedNpmPackages({
      publishable: [utils, io],
      changed: [utils, npmSkip],
    })
    expect(selected.map(pkg => pkg.json.name).sort()).toEqual(['@fuman/io', '@fuman/utils'])
  })
})

