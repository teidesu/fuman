import type { WorkspacePackage } from '../package-json/collect-package-jsons.js'
import type { PackageJson } from '../package-json/types.js'

import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { exec } from '../misc/exec.js'
import { findProjectChangedFiles, findProjectChangedPackages } from './collect-files.js'

function workspacePackage(json: PackageJson, path: string, root = false): WorkspacePackage {
  return {
    path,
    packageJsonPath: join(path, 'package.json'),
    root,
    json,
  }
}

async function git(cwd: string, args: string[]): Promise<string> {
  const res = await exec(['git', ...args], { cwd, throwOnError: true })
  return res.stdout.trim()
}

async function initRepo(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), prefix))
  await git(dir, ['init', '-b', 'main'])
  await git(dir, ['config', 'user.email', 'test@example.com'])
  await git(dir, ['config', 'user.name', 'Test'])
  await git(dir, ['config', 'commit.gpgsign', 'false'])
  return dir
}

describe('findProjectChangedPackages', () => {
  it('returns packages with source changes and excludes tests and markdown by default', async () => {
    const dir = await initRepo('fuman-changed-')
    const utilsDir = join(dir, 'packages', 'utils')
    const ioDir = join(dir, 'packages', 'io')
    await mkdir(utilsDir, { recursive: true })
    await mkdir(ioDir, { recursive: true })
    await writeFile(join(utilsDir, 'index.ts'), 'export {}\n')
    await writeFile(join(ioDir, 'index.ts'), 'export {}\n')
    await git(dir, ['add', '.'])
    await git(dir, ['commit', '-m', 'chore: initial'])
    const since = await git(dir, ['rev-parse', 'HEAD'])

    await writeFile(join(utilsDir, 'index.ts'), 'export const n = 1\n')
    await writeFile(join(utilsDir, 'index.test.ts'), 'export {}\n')
    await writeFile(join(utilsDir, 'notes.md'), '# notes\n')
    await writeFile(join(ioDir, 'readme.md'), '# io\n')
    await git(dir, ['add', '.'])
    await git(dir, ['commit', '-m', 'feat: change files'])

    const workspace = [
      workspacePackage({ name: 'fuman', version: '0.1.0' }, dir, true),
      workspacePackage({ name: '@fuman/utils', version: '0.1.0' }, utilsDir),
      workspacePackage({ name: '@fuman/io', version: '0.1.0' }, ioDir),
    ]

    const files = await findProjectChangedFiles({
      workspace,
      root: dir,
      since,
      params: { shouldInclude: () => true },
    })
    expect(files.map(file => `${file.package.json.name}:${file.file}`)).toEqual(['@fuman/utils:index.ts'])

    const packages = await findProjectChangedPackages({
      workspace,
      root: dir,
      since,
      params: { shouldInclude: () => true },
    })
    expect(packages.map(pkg => pkg.json.name)).toEqual(['@fuman/utils'])
  })

  it('does not attribute packages/foo-bar files to packages/foo', async () => {
    const dir = await initRepo('fuman-changed-prefix-')
    const fooDir = join(dir, 'packages', 'foo')
    const fooBarDir = join(dir, 'packages', 'foo-bar')
    await mkdir(fooDir, { recursive: true })
    await mkdir(fooBarDir, { recursive: true })
    await writeFile(join(fooDir, 'index.ts'), 'export {}\n')
    await writeFile(join(fooBarDir, 'index.ts'), 'export {}\n')
    await git(dir, ['add', '.'])
    await git(dir, ['commit', '-m', 'chore: initial'])
    const since = await git(dir, ['rev-parse', 'HEAD'])

    await writeFile(join(fooBarDir, 'index.ts'), 'export const n = 1\n')
    await git(dir, ['add', '.'])
    await git(dir, ['commit', '-m', 'feat: change foo-bar'])

    const workspace = [
      workspacePackage({ name: '@fuman/foo', version: '0.1.0' }, fooDir),
      workspacePackage({ name: '@fuman/foo-bar', version: '0.1.0' }, fooBarDir),
    ]

    const files = await findProjectChangedFiles({
      workspace,
      root: dir,
      since,
      params: { shouldInclude: () => true },
    })
    expect(files.map(file => `${file.package.json.name}:${file.file}`)).toEqual(['@fuman/foo-bar:index.ts'])
  })

  it('includes .ts files when there is no tsconfig instead of throwing', async () => {
    const dir = await initRepo('fuman-changed-nots-')
    const utilsDir = join(dir, 'packages', 'utils')
    await mkdir(utilsDir, { recursive: true })
    await writeFile(join(utilsDir, 'index.ts'), 'export {}\n')
    await git(dir, ['add', '.'])
    await git(dir, ['commit', '-m', 'chore: initial'])
    const since = await git(dir, ['rev-parse', 'HEAD'])

    await writeFile(join(utilsDir, 'index.ts'), 'export const n = 1\n')
    await git(dir, ['add', '.'])
    await git(dir, ['commit', '-m', 'feat: change files'])

    const workspace = [
      workspacePackage({ name: 'fuman', version: '0.1.0' }, dir, true),
      workspacePackage({ name: '@fuman/utils', version: '0.1.0' }, utilsDir),
    ]

    const files = await findProjectChangedFiles({
      workspace,
      root: dir,
      since,
    })
    expect(files.map(file => `${file.package.json.name}:${file.file}`)).toEqual(['@fuman/utils:index.ts'])
  })
})
