import type { WorkspacePackage } from '../package-json/collect-package-jsons.js'
import type { PackageJson } from '../package-json/types.js'

import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { exec } from '../misc/exec.js'
import { generateChangelog } from './generate-changelog.js'

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

async function setupRepo(): Promise<{
  dir: string
  since: string
  workspace: WorkspacePackage[]
}> {
  const dir = await mkdtemp(join(tmpdir(), 'fuman-changelog-'))
  await git(dir, ['init', '-b', 'main'])
  await git(dir, ['config', 'user.email', 'test@example.com'])
  await git(dir, ['config', 'user.name', 'Test'])
  await git(dir, ['config', 'commit.gpgsign', 'false'])

  const utilsDir = join(dir, 'packages', 'utils')
  const ioDir = join(dir, 'packages', 'io')
  await mkdir(utilsDir, { recursive: true })
  await mkdir(ioDir, { recursive: true })
  await writeFile(join(utilsDir, 'package.json'), '{"name":"@fuman/utils","version":"0.1.0"}\n')
  await writeFile(join(ioDir, 'package.json'), '{"name":"@fuman/io","version":"0.1.0"}\n')
  await writeFile(join(utilsDir, 'index.ts'), 'export {}\n')
  await writeFile(join(ioDir, 'index.ts'), 'export {}\n')
  await git(dir, ['add', '.'])
  await git(dir, ['commit', '-m', 'chore: initial'])
  const since = await git(dir, ['rev-parse', 'HEAD'])

  await writeFile(join(utilsDir, 'index.ts'), 'export const n = 1\n')
  await git(dir, ['add', '.'])
  await git(dir, ['commit', '-m', 'feat: add utils export'])

  await writeFile(join(ioDir, 'index.ts'), 'export const n = 2\n')
  await git(dir, ['add', '.'])
  await git(dir, ['commit', '-m', 'fix: tweak io export'])

  await writeFile(join(utilsDir, 'index.ts'), 'export const n = 3\n')
  await git(dir, ['add', '.'])
  await git(dir, ['commit', '-m', 'chore: format utils'])

  const workspace = [
    workspacePackage({ name: '@fuman/utils', version: '0.1.0' }, utilsDir),
    workspacePackage({ name: '@fuman/io', version: '0.1.0' }, ioDir),
  ]

  return { dir, since, workspace }
}

describe('generateChangelog', () => {
  it('groups conventional commits per package and skips chore by default', async () => {
    const { dir, since, workspace } = await setupRepo()

    const changelog = await generateChangelog({
      workspace,
      cwd: dir,
      since,
      params: {
        shouldInclude: () => true,
      },
    })

    expect(changelog).toContain('### @fuman/utils')
    expect(changelog).toContain('feat: add utils export')
    expect(changelog).toContain('### @fuman/io')
    expect(changelog).toContain('fix: tweak io export')
    expect(changelog).not.toContain('chore: format utils')
    expect(changelog).not.toContain('chore: initial')
  })

  it('limits the changelog to the packages in workspace', async () => {
    const { dir, since, workspace } = await setupRepo()

    const changelog = await generateChangelog({
      workspace: workspace.filter(pkg => pkg.json.name === '@fuman/utils'),
      cwd: dir,
      since,
      params: {
        shouldInclude: () => true,
      },
    })

    expect(changelog).toContain('### @fuman/utils')
    expect(changelog).toContain('feat: add utils export')
    expect(changelog).not.toContain('### @fuman/io')
    expect(changelog).not.toContain('fix: tweak io export')
  })
})
