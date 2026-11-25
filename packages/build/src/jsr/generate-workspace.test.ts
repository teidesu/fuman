import type { WorkspacePackage } from '../package-json/collect-package-jsons.js'

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { fileExists } from '../misc/fs.js'
import { generateDenoWorkspace } from './generate-workspace.js'

describe('generateDenoWorkspace', () => {
  const dirs: string[] = []

  afterEach(async () => {
    await Promise.all(dirs.map(dir => rm(dir, { recursive: true, force: true })))
    dirs.length = 0
  })

  it('skips node_modules, .git, and dist, and runs root finalizeDenoJson', async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), 'fuman-jsr-ws-'))
    dirs.push(workspaceRoot)
    const packageRoot = join(workspaceRoot, 'packages', 'pkg')
    await mkdir(join(packageRoot, 'node_modules', 'dep'), { recursive: true })
    await mkdir(join(packageRoot, '.git'), { recursive: true })
    await mkdir(join(packageRoot, 'dist'), { recursive: true })
    await writeFile(join(packageRoot, 'index.ts'), 'export const n = 1\n')
    await writeFile(join(packageRoot, 'node_modules', 'dep', 'index.js'), 'export {}\n')
    await writeFile(join(packageRoot, '.git', 'HEAD'), 'ref: refs/heads/main\n')
    await writeFile(join(packageRoot, 'dist', 'out.js'), 'export {}\n')
    await writeFile(join(packageRoot, 'package.json'), JSON.stringify({
      name: '@tmp/pkg',
      version: '1.0.0',
      exports: { '.': './index.ts' },
    }))
    await writeFile(join(workspaceRoot, 'package.json'), JSON.stringify({
      name: 'root',
      workspaces: ['packages/*'],
    }))

    const workspace: WorkspacePackage[] = [
      {
        path: workspaceRoot,
        packageJsonPath: join(workspaceRoot, 'package.json'),
        root: true,
        json: { name: 'root', workspaces: ['packages/*'] },
      },
      {
        path: packageRoot,
        packageJsonPath: join(packageRoot, 'package.json'),
        root: false,
        json: {
          name: '@tmp/pkg',
          version: '1.0.0',
          exports: { '.': './index.ts' },
        },
      },
    ]

    const outDir = await generateDenoWorkspace({
      workspaceRoot,
      workspacePackages: workspace,
      rootConfig: {
        outputDir: 'jsr-out',
        dryRun: false,
        finalizeDenoJson(_ctx, denoJson) {
          denoJson.fromRoot = true
        },
      },
    })

    const packageOut = join(outDir, '@tmp__pkg')
    expect(await fileExists(join(packageOut, 'index.ts'))).toBe(true)
    expect(await fileExists(join(packageOut, 'node_modules', 'dep', 'index.js'))).toBe(false)
    expect(await fileExists(join(packageOut, '.git', 'HEAD'))).toBe(false)
    expect(await fileExists(join(packageOut, 'dist', 'out.js'))).toBe(false)

    const denoJson = JSON.parse(await readFile(join(packageOut, 'deno.json'), 'utf8')) as { fromRoot?: boolean }
    expect(denoJson.fromRoot).toBe(true)
  })
})
