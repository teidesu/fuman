import type { Plugin } from 'vite'
import type { WorkspacePackage } from '../package-json/collect-package-jsons.js'
import type { PackageJson } from '../package-json/types.js'

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { afterEach, describe, expect, it } from 'vitest'

import { fumanBuild } from './build-plugin.js'

function asPlugin(value: unknown): Plugin {
  if (value == null || typeof value !== 'object' || !('name' in value)) {
    throw new Error('expected a vite plugin')
  }
  return value as Plugin
}

async function runCloseBundle(plugin: Plugin): Promise<void> {
  const configHook = plugin.config
  const handler = typeof configHook === 'function' ? configHook : configHook?.handler
  if (handler == null) throw new Error('plugin is missing config hook')
  await handler.call({} as never, {}, { command: 'build', mode: 'production', isSsrBuild: false })

  const closeHook = plugin.closeBundle
  const close = typeof closeHook === 'function' ? closeHook : closeHook?.handler
  if (close == null) throw new Error('plugin is missing closeBundle hook')
  await close.call({} as never)
}

describe('fumanBuild package.json processing', () => {
  const dirs: string[] = []
  const previousPackagesList = process.env.__FUMAN_INTERNAL_PACKAGES_LIST
  const previousFixedVersion = process.env.__FUMAN_INTERNAL_FIXED_VERSION

  afterEach(async () => {
    if (previousPackagesList === undefined) delete process.env.__FUMAN_INTERNAL_PACKAGES_LIST
    else process.env.__FUMAN_INTERNAL_PACKAGES_LIST = previousPackagesList
    if (previousFixedVersion === undefined) delete process.env.__FUMAN_INTERNAL_FIXED_VERSION
    else process.env.__FUMAN_INTERNAL_FIXED_VERSION = previousFixedVersion

    await Promise.all(dirs.map(dir => rm(dir, { recursive: true, force: true })))
    dirs.length = 0
  })

  async function tempWorkspace(pkgJson: PackageJson): Promise<{ workspaceRoot: string, packageRoot: string }> {
    const workspaceRoot = await mkdtemp(join(tmpdir(), 'fuman-build-plugin-'))
    dirs.push(workspaceRoot)
    const packageRoot = join(workspaceRoot, 'packages', 'pkg')
    await mkdir(packageRoot, { recursive: true })
    await writeFile(join(workspaceRoot, 'package.json'), JSON.stringify({ name: 'root', workspaces: ['packages/*'] }))
    await writeFile(join(packageRoot, 'package.json'), JSON.stringify(pkgJson))

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
        json: pkgJson,
      },
    ]
    process.env.__FUMAN_INTERNAL_PACKAGES_LIST = JSON.stringify(workspace)
    return { workspaceRoot, packageRoot }
  }

  it('sets packageJson.version from fixedVersion after processPackageJson', async () => {
    const { workspaceRoot, packageRoot } = await tempWorkspace({
      name: '@tmp/pkg',
      version: '1.2.3',
      sideEffects: false,
      exports: { '.': './src/index.ts' },
    })
    process.env.__FUMAN_INTERNAL_FIXED_VERSION = '0.0.0-canary.1'

    const plugins = await fumanBuild({ root: workspaceRoot, packageRoot })
    const plugin = asPlugin(plugins.find(item => asPlugin(item).name === 'vite-plugin-fuman-build'))
    await mkdir(join(packageRoot, 'dist'), { recursive: true })
    await runCloseBundle(plugin)

    const dist = JSON.parse(await readFile(join(packageRoot, 'dist', 'package.json'), 'utf8')) as PackageJson
    expect(dist.version).toBe('0.0.0-canary.1')
  })

  it('calls processPackageJson with hookContext.packageJson after preparePackageJson replacement', async () => {
    const { workspaceRoot, packageRoot } = await tempWorkspace({
      name: '@tmp/pkg',
      version: '1.0.0',
      sideEffects: false,
      exports: { '.': './src/original.ts' },
    })

    const plugins = await fumanBuild({
      root: workspaceRoot,
      packageRoot,
      preparePackageJson(ctx) {
        ctx.packageJson = {
          ...ctx.packageJson,
          exports: { './replaced': './src/replaced.ts' },
        }
      },
    })
    const plugin = asPlugin(plugins.find(item => asPlugin(item).name === 'vite-plugin-fuman-build'))
    await mkdir(join(packageRoot, 'dist'), { recursive: true })
    await runCloseBundle(plugin)

    const dist = JSON.parse(await readFile(join(packageRoot, 'dist', 'package.json'), 'utf8')) as PackageJson
    expect(Object.keys(dist.exports ?? {})).toEqual(['./replaced'])
    expect(dist.exports).toEqual({
      './replaced': {
        import: { types: './replaced.d.ts', default: './replaced.js' },
        require: { types: './replaced.d.cts', default: './replaced.cjs' },
      },
    })
  })
})
