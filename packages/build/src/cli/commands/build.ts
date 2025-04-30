import type { WorkspacePackage } from '../../package-json/collect-package-jsons.js'
import { join } from 'node:path'

import process from 'node:process'
import { exec } from '../../misc/exec.js'
import { collectPackageJsons } from '../../package-json/collect-package-jsons.js'
import { findPackageByName } from '../../package-json/utils.js'

import { bc, loadConfig } from './_utils.js'

/**
 * build a single package using vite
 *
 * tiny wrapper on top of `vite build`
 */
export async function buildPackage(params: {
  /** path to the workspace root */
  workspaceRoot: string
  /**
   * list of workspace packages **including root**
   */
  workspace?: WorkspacePackage[]
  /** name of the package to build */
  packageName: string
  /** path to the `build.config.js` file */
  configPath?: string
  /** "fixed" version to use when building the package */
  fixedVersion?: string
}): Promise<void> {
  const config = await loadConfig(params)
  const workspacePackages = params.workspace ?? await collectPackageJsons(params.workspaceRoot, true)

  const viteConfig = config?.viteConfig ?? 'vite.config.js'
  const packageRoot = findPackageByName(workspacePackages, params.packageName).path

  await exec(['npx', 'vite', 'build', '--config', join(params.workspaceRoot, viteConfig)], {
    env: {
      ...process.env,
      __FUMAN_INTERNAL_PACKAGES_LIST: JSON.stringify(workspacePackages),
      __FUMAN_INTERNAL_FIXED_VERSION: params.fixedVersion,
    },
    cwd: packageRoot,
    stdio: 'inherit',
    throwOnError: true,
  })
}

export const buildPackageCli = bc.command({
  name: 'build',
  desc: 'build a package',
  options: {
    config: bc.string('config')
      .desc('path to the build.config.js file'),
    root: bc.string().desc('path to the root of the workspace (default: cwd)'),
    packageName: bc.positional('package-name')
      .desc('name of the package to build')
      .required(),
    fixedVersion: bc.string('fixed-version')
      .desc('version to publish the package to (overrides the version in every package.json, useful for pre-releases)'),
  },
  handler: async (args) => {
    await buildPackage({
      workspaceRoot: args.root ?? process.cwd(),
      packageName: args.packageName,
      configPath: args.config,
      fixedVersion: args.fixedVersion,
    })
  },
})
