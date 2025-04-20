import type { WorkspacePackage } from '../../package-json/collect-package-jsons.js'
import { join } from 'node:path'

import process from 'node:process'

import { asNonNull } from '@fuman/utils'
import { isRunningInGithubActions } from '../../ci/github-actions.js'
import { getLatestTag } from '../../git/utils.js'
import { exec } from '../../misc/exec.js'

import { collectPackageJsons, filterPackageJsonsForPublish } from '../../package-json/collect-package-jsons.js'
import { findProjectChangedPackages } from '../../versioning/collect-files.js'
import { bc, loadConfig } from './_utils.js'
import { buildPackage } from './build.js'

export async function runContinuousRelease(params: {
  workspaceRoot?: string
  workspace?: WorkspacePackage[]
  distDir?: string
  extraArgs?: string[]
  onlyChanged?: boolean
  onlyChangedSince?: string
}): Promise<void> {
  const {
    workspaceRoot = process.cwd(),
    workspace = await collectPackageJsons(workspaceRoot, true),
    distDir = 'dist',
    extraArgs = [],
    onlyChanged = false,
    onlyChangedSince,
  } = params

  const workspaceWithoutRoot = workspace.filter(pkg => !pkg.root)

  let packages = filterPackageJsonsForPublish(workspaceWithoutRoot, 'npm')

  if (onlyChanged) {
    const config = await loadConfig({
      workspaceRoot,
      require: false,
    })
    const since = onlyChangedSince ?? (await getLatestTag(workspaceRoot))
    if (since == null) {
      throw new Error('no previous tag found, cannot determine changeset')
    }

    const changedPackages = await findProjectChangedPackages({
      params: config?.versioning,
      workspace: workspaceWithoutRoot,
      root: workspaceRoot,
      since,
    })

    if (!changedPackages.length) {
      console.log(`🤔 no packages changed since ${since}, nothing to do`)
      return
    }

    // we want to also publish any packages that depend on the changed ones
    const changedPackagesNames = new Set<string>()
    for (const pkg of changedPackages) {
      changedPackagesNames.add(asNonNull(pkg.json.name))
    }

    let hadChanges = true
    while (hadChanges) {
      hadChanges = false

      for (const pkg of packages) {
        const pkgName = asNonNull(pkg.json.name)

        for (const field of ['dependencies', 'peerDependencies']) {
          const deps = pkg.json[field] as Record<string, string>
          if (deps == null) continue

          for (const name of Object.keys(deps)) {
            if (changedPackagesNames.has(name) && !changedPackagesNames.has(pkgName)) {
              hadChanges = true
              changedPackages.push(pkg)
              changedPackagesNames.add(pkgName)
              break
            }
          }
        }
      }
    }

    packages = changedPackages

    console.log(`📝 only publishing changed packages since ${since}:`)
    for (const pkg of packages) {
      console.log(`  - ${pkg.json.name}`)
    }
  }

  if (!isRunningInGithubActions()) {
    throw new Error('cr command is only supported in github actions')
  }

  const distPaths: string[] = []

  for (const pkg of packages) {
    if (pkg.json.scripts?.build !== undefined) {
      await exec([
        'npm',
        'run',
        'build',
      ], {
        cwd: join(pkg.path),
        stdio: 'inherit',
        throwOnError: true,
      })
    } else {
      await buildPackage({
        workspaceRoot,
        workspace,
        packageName: asNonNull(pkg.json.name),
      })
    }

    distPaths.push(join(pkg.path, distDir))
  }

  if (extraArgs.some(it => it.startsWith('--pnpm'))) {
    console.warn('`--pnpm` flag is not supported and may cause issues, please avoid using it')
  }

  await exec([
    'npx',
    'pkg-pr-new',
    'publish',
    ...extraArgs,
    ...distPaths,
  ], {
    cwd: workspaceRoot,
    throwOnError: true,
    stdio: 'inherit',
  })
}

export const runContinuousReleaseCli = bc.command({
  name: 'cr',
  desc: 'publish the workspace to pkg.pr.new',
  options: {
    root: bc.string()
      .desc('path to the root of the workspace (default: cwd)'),
    distDir: bc.string('dist-dir')
      .desc('directory to publish from, relative to package root (default: dist)'),
    extraArgs: bc.string('extra-args')
      .desc('extra arguments to pass to pkg-pr-new'),
    onlyChanged: bc.boolean('only-changed')
      .desc('whether to only publish packages changed since the last release.')
      .default(false),
    onlyChangedSince: bc.string('only-changed-since')
      .desc('starting point for the changelog (defaults to latest tag)'),
  },
  transform: (args) => {
    return {
      ...args,
      extraArgs: args.extraArgs?.split(' '),
    }
  },
  handler: runContinuousRelease,
})
