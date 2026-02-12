import type { WorkspacePackage } from '../../package-json/collect-package-jsons.js'
import * as fsp from 'node:fs/promises'

import { join, resolve } from 'node:path'
import process from 'node:process'

import { asNonNull } from '@fuman/utils'
import { isRunningInGithubActions, writeGithubActionsOutput } from '../../ci/github-actions.js'
import { exec } from '../../misc/exec.js'
import { sortWorkspaceByPublishOrder } from '../../misc/publish-order.js'
import { npmCheckVersion } from '../../npm/npm-api.js'

import { collectPackageJsons, filterPackageJsonsForPublish } from '../../package-json/collect-package-jsons.js'
import { parsePackageJsonFile } from '../../package-json/parse.js'
import { bc } from './_utils.js'
import { buildPackage } from './build.js'

export interface PublishPackagesResult {
  failed: string[]
  tarballs: string[]
}

const DEFAULT_REGISTRY_URL = 'https://registry.npmjs.org'

export async function publishPackages(params: {
  workspaceRoot?: string
  workspace?: WorkspacePackage[]
  packages: string[]
  unpublishExisting?: boolean
  registryUrl?: string
  token?: string
  distDir?: string
  dryRun?: boolean
  publishArgs?: string[]
  withTarballs?: boolean
  withBuild?: boolean
  skipVersionCheck?: boolean
  fixedVersion?: string
  noProvenance?: boolean
}): Promise<PublishPackagesResult> {
  const {
    workspaceRoot = process.cwd(),
    workspace = await collectPackageJsons(workspaceRoot, true),
    packages,
    unpublishExisting = false,
    skipVersionCheck = false,
    registryUrl = DEFAULT_REGISTRY_URL,
    token,
    distDir = 'dist',
    publishArgs = [],
    dryRun,
    withTarballs,
    withBuild,
    fixedVersion,
    noProvenance = false,
  } = params

  const workspaceWithoutRoot = workspace.filter(pkg => !pkg.root)

  const ordered = filterPackageJsonsForPublish(sortWorkspaceByPublishOrder(workspaceWithoutRoot), 'npm')

  const toPublish = packages.length === 1 && packages[0] === ':all'
    ? ordered
    : ordered.filter(pkg => packages.includes(asNonNull(pkg.json.name)))

  const failed: string[] = []
  const tarballs: string[] = []

  if (token != null && !dryRun) {
    await exec([
      'npm',
      'config',
      'set',
      '--global',
      new URL(':_authToken', registryUrl).href.replace(/^https:\/\//, '//'),
      token,
    ], { throwOnError: true })
  }

  if (!dryRun) {
    // validate the token
    await exec(['npm', 'whoami', '--registry', registryUrl], { throwOnError: true })
  }

  if (
    !noProvenance
    && isRunningInGithubActions()
    && Boolean(process.env.ACTIONS_ID_TOKEN_REQUEST_URL)
    && registryUrl === DEFAULT_REGISTRY_URL
  ) {
    // we can use --provenance flag to generate a provenance statement
    if (!publishArgs.some(it => it.startsWith('--provenance'))) {
      publishArgs.push('--provenance')
    }
  }

  for (const pkg of toPublish) {
    // check if this version is already published
    const pkgVersion = fixedVersion ?? asNonNull(pkg.json.version)
    if (!dryRun && !skipVersionCheck && await npmCheckVersion({
      registry: registryUrl,
      package: asNonNull(pkg.json.name),
      version: pkgVersion,
    })) {
      if (unpublishExisting) {
        await exec([
          'npm',
          'unpublish',
          '--force',
          '--registry',
          registryUrl,
          `${asNonNull(pkg.json.name)}@${pkgVersion}`,
        ], {
          stdio: 'inherit',
        })
      } else {
        console.log(`Skipping ${pkg.json.name}@${pkgVersion} because it is already published`)
        continue
      }
    }

    if (withBuild) {
      if (pkg.json.scripts?.build !== undefined) {
        const res = await exec([
          'npm',
          'run',
          'build',
        ], {
          cwd: join(pkg.path),
          stdio: 'inherit',
        })

        if (res.exitCode !== 0) {
          console.log('failed to build %s', pkg.json.name)
          failed.push(asNonNull(pkg.json.name))
          continue
        }
      } else {
        try {
          await buildPackage({
            workspaceRoot,
            workspace,
            packageName: asNonNull(pkg.json.name),
            fixedVersion,
          })
        } catch (err) {
          console.log('failed to build %s:', pkg.json.name)
          console.error(err)
          failed.push(asNonNull(pkg.json.name))
          continue
        }
      }
    }

    const fullDistDir = join(pkg.path, distDir)

    if (fixedVersion != null) {
      // NB: we always generate package.json in dist/ regardless of the original package.json format
      const distPkgJsonPath = join(fullDistDir, 'package.json')

      const pkgJson = await parsePackageJsonFile(distPkgJsonPath)
      pkgJson.version = fixedVersion
      await fsp.writeFile(distPkgJsonPath, JSON.stringify(pkgJson, null, 4))
    }

    console.log(`publishing ${pkg.json.name}@${pkgVersion}`)

    if (pkg.json.name?.includes('/')) {
      // scoped packages are published as `private` by default,
      // which is not an obvious choice. unless the user explicitly
      // opts in, we will publish them as public
      if (!publishArgs.some(it => it.startsWith('--access'))) {
        publishArgs.push('--access=public')
      }
    }

    const res = await exec([
      'npm',
      'publish',
      '--registry',
      registryUrl,
      ...(dryRun ? ['--dry-run'] : ['-q']),
      ...publishArgs,
    ], {
      cwd: fullDistDir,
      stdio: 'inherit',
    })

    if (res.exitCode !== 0) {
      failed.push(asNonNull(pkg.json.name))
    }

    if (withTarballs) {
      const tar = await exec(['npm', 'pack', '-q'], {
        cwd: fullDistDir,
      })
      if (tar.exitCode !== 0) {
        console.error(tar.stderr)
      } else {
        tarballs.push(join(fullDistDir, tar.stdout.trim()))
      }
    }
  }

  return {
    failed,
    tarballs,
  }
}

export const publishPackagesCli = bc.command({
  name: 'publish',
  desc: 'publish packages to npm',
  options: {
    root: bc.string()
      .desc('path to the root of the workspace (default: cwd)'),
    unpublishExisting: bc.boolean('unpublish-existing')
      .desc('whether to unpublish if the version is already published (only available for certain registries, won\'t work with registry.npmjs.org)'),
    skipVersionCheck: bc.boolean('skip-version-check')
      .desc('whether to skip checking if the version is already published'),
    registryUrl: bc.string('registry')
      .desc('URL of the registry to publish to'),
    token: bc.string('token')
      .desc('token to use for publishing (note: this will override the global .npmrc file)'),
    distDir: bc.string('dist-dir')
      .desc('directory to publish from, relative to package root (default: dist)'),
    dryRun: bc.boolean('dry-run')
      .desc('whether to skip publishing and only print what is going to happen'),
    publishArgs: bc.string('publish-args')
      .desc('arguments to pass to `npm publish`'),
    packages: bc.positional('packages')
      .desc('name of the packages to publish (comma-separated, or :all to publish the entire workspace)')
      .default(':all'),
    withTarballs: bc.boolean('with-tarballs')
      .desc('whether to generate tarballs in the dist directory using `npm pack` (doesn\'t work with jsr)'),
    withBuild: bc.boolean('with-build')
      .desc('whether to build the package before publishing using `build` npm script (or defaulting to building using fuman-build if one is not found)'),
    fixedVersion: bc.string('fixed-version')
      .desc('version to publish the package to (overrides the version in every package.json, useful for pre-releases)'),
    noProvenance: bc.boolean('no-provenance')
      .desc('version to NOT use provenance even when it should be possible'),
  },
  handler: async (options) => {
    const { failed, tarballs } = await publishPackages({
      ...options,
      workspaceRoot: options.root != null ? resolve(process.cwd(), options.root) : process.cwd(),
      packages: options.packages.split(','),
      publishArgs: options.publishArgs?.split(' '),
    })

    if (failed.length > 0) {
      console.log('failed to publish:')
      for (const pkg of failed) {
        console.log(`  ${pkg}`)
      }

      process.exit(1)
    }

    if (tarballs.length > 0) {
      if (isRunningInGithubActions()) {
        console.log('written paths to tarballs to `tarballs` output')
        writeGithubActionsOutput('tarballs', tarballs.join(','))
      } else {
        console.log('tarballs generated:')
        for (const tar of tarballs) {
          console.log(`  ${tar}`)
        }
      }
    }
  },
})
