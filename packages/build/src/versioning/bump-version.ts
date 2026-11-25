import type { ReleaseType } from 'semver'
import type { CommitInfo, ConventionalCommit } from '../git/utils.js'

import type { WorkspacePackage } from '../package-json/collect-package-jsons.js'
import type { PackageJson } from '../package-json/types.js'
import type { VersioningOptions } from './types.js'
import * as fsp from 'node:fs/promises'
import { join } from 'node:path'
import process from 'node:process'

import { asNonNull } from '@fuman/utils'
import detectIndent from 'detect-indent'

import { gt, inc, parse, satisfies } from 'semver'
import { getCommitsBetween, getLatestTag, parseConventionalCommit } from '../git/utils.js'
import { collectVersions, findRootPackage } from '../package-json/utils.js'
import { findProjectChangedPackages } from './collect-files.js'

export interface BumpVersionPackage {
  /** info about the package */
  package: WorkspacePackage
  /** version before the bump */
  prevVersion: string
  /**
   * if the package was not changed by itself,
   * but the bump is required because of another package
   * that was changed depending on it, name of that package
   */
  because?: string[]
}

export interface BumpVersionResult {
  /** max version of all packages */
  maxVersion: string
  /** next version */
  nextVersions: Record<string, string>
  /** changed packages which will be bumped to `nextVersion` */
  changedPackages: BumpVersionPackage[]

  /** detected release type */
  releaseType: ReleaseType
  /**
   * whether there are breaking changes
   * (note: will be false if release type is explicitly provided)
   */
  hasBreakingChanges: boolean
  /**
   * whether there are new features
   * (note: will be false if release type is explicitly provided)
   */
  hasFeatures: boolean
}

function parseCommit(commit: CommitInfo): ConventionalCommit | null {
  return parseConventionalCommit(`${commit.message}\n${commit.description}`)
}

function summarizeCommits(commits: CommitInfo[]): { hasBreakingChanges: boolean, hasFeatures: boolean } {
  let hasBreakingChanges = false
  let hasFeatures = false
  for (const commit of commits) {
    const parsed = parseCommit(commit)
    if (!parsed) continue
    if (parsed.breaking) hasBreakingChanges = true
    if (parsed.type === 'feat') hasFeatures = true
  }
  return { hasBreakingChanges, hasFeatures }
}

function bumpFromFlags(
  oldVersion: string,
  flags: { hasBreakingChanges: boolean, hasFeatures: boolean },
): 'major' | 'minor' | 'patch' {
  const parsedVersion = parse(oldVersion)
  if (!parsedVersion) {
    throw new Error(`Invalid version: ${oldVersion}`)
  }

  if (flags.hasBreakingChanges) {
    if (parsedVersion.major === 0 && parsedVersion.minor === 0) {
      return 'patch'
    } else if (parsedVersion.major === 0) {
      return 'minor'
    } else {
      return 'major'
    }
  } else if (flags.hasFeatures) {
    return parsedVersion.major === 0 ? 'patch' : 'minor'
  } else {
    return 'patch'
  }
}

export function determineBumpType(params: {
  oldVersion: string
  commits: CommitInfo[]
}): 'major' | 'minor' | 'patch' {
  return bumpFromFlags(params.oldVersion, summarizeCommits(params.commits))
}

async function writePackageVersion(pkg: WorkspacePackage, version: string, dryRun: boolean): Promise<void> {
  if (!dryRun) {
    const pkgJsonPath = join(pkg.path, 'package.json')
    const pkgJsonText = await fsp.readFile(pkgJsonPath, 'utf8')
    const indent = detectIndent(pkgJsonText).indent || '    '

    const pkgJson = JSON.parse(pkgJsonText) as PackageJson
    pkgJson.version = version

    await fsp.writeFile(pkgJsonPath, `${JSON.stringify(pkgJson, null, indent)}\n`)
  }

  pkg.json.version = version
}

async function nextStandaloneVersion(pkg: WorkspacePackage, cwd: string | URL): Promise<string> {
  let newVersion = asNonNull(pkg.json.version)
  const standalonePrevTag = await getLatestTag(pkg.path)

  if (standalonePrevTag != null) {
    const commits = await getCommitsBetween({
      since: standalonePrevTag,
      cwd,
      files: [join(pkg.path, '**')],
    })
    if (commits.length > 0) {
      const bumpType = determineBumpType({ oldVersion: newVersion, commits })
      newVersion = asNonNull(inc(newVersion, bumpType))
    }
  }

  return newVersion
}

function bumpDependants(params: {
  changedPackages: WorkspacePackage[]
  workspace: WorkspacePackage[]
  result: BumpVersionPackage[]
  nextVersion: string
  type: ReleaseType
  bumpWithDependants?: boolean | 'only-minor'
  workspaceVersions: Record<string, string>
}): void {
  const { changedPackages, workspace, result, nextVersion, type, bumpWithDependants, workspaceVersions } = params

  for (const pkg of changedPackages) {
    if (pkg.json.fuman?.ownVersioning) continue

    const pkgName = asNonNull(pkg.json.name)
    for (const otherPkg of workspace) {
      for (const kind of ['dependencies', 'peerDependencies']) {
        const obj = otherPkg.json[kind] as Record<string, string>
        if (obj == null) continue
        if (obj[pkgName] == null || typeof obj[pkgName] !== 'string') continue

        let expandedVersion = obj[pkgName]
        if (!expandedVersion.startsWith('workspace:') && otherPkg.json.fuman?.standalone) {
          continue
        }
        if (expandedVersion === 'workspace:^') expandedVersion = `^${workspaceVersions[pkgName]}`
        if (expandedVersion === 'workspace:*') expandedVersion = workspaceVersions[pkgName]

        let shouldBump: boolean
        if (bumpWithDependants === true) {
          shouldBump = true
        } else if (bumpWithDependants === 'only-minor') {
          shouldBump = !satisfies(nextVersion, expandedVersion) && type === 'minor'
        } else {
          shouldBump = !satisfies(nextVersion, expandedVersion)
        }

        if (shouldBump) {
          if (otherPkg.json.fuman?.ownVersioning) {
            throw new Error(`package ${otherPkg.json.name}@${otherPkg.json.version} is marked as "own versioning", and will not be compatible with ${pkgName}@${expandedVersion} after bumping. please bump it manually`)
          }

          const existing = result.find(item => item.package.json.name === otherPkg.json.name)
          if (existing) {
            if (!existing.because) break
            existing.because.push(pkgName)
          } else {
            result.push({
              package: otherPkg,
              prevVersion: asNonNull(otherPkg.json.version),
              because: [pkgName],
            })
          }
          break
        }
      }
    }
  }
}

export async function bumpVersion(params: {
  /** packages for which to generate the changelog */
  workspace: WorkspacePackage[]
  /** whether to bump version of all packages, not just changed ones */
  all?: boolean
  type?: ReleaseType
  /** root of the git repo */
  cwd?: string | URL
  /** starting point for the changelog (defaults to latest tag) */
  since: string
  /** versioning params */
  params?: VersioningOptions
  /** whether to not actually write the files */
  dryRun?: boolean
  /** whether to also bump version of the root package.json */
  withRoot?: boolean
}): Promise<BumpVersionResult> {
  const {
    workspace,
    all,
    cwd = process.cwd(),
    since,
    dryRun = false,
    withRoot = false,
  } = params

  const workspaceWithoutRoot = workspace.filter(pkg => !pkg.root)

  let maxVersion: string | null = null
  for (const pkg of workspaceWithoutRoot) {
    const version = asNonNull(pkg.json.version)

    if (pkg.json.fuman?.ownVersioning || pkg.json.fuman?.standalone) {
      continue
    }

    if (maxVersion == null || gt(version, maxVersion)) {
      maxVersion = version
    }
  }

  if (maxVersion == null) {
    throw new Error('No packages found with fuman-managed versioning')
  }

  const changedPackages = all
    ? workspaceWithoutRoot
    : await findProjectChangedPackages({
        workspace: workspaceWithoutRoot,
        root: cwd,
        since,
        params: params.params,
      })

  let type: ReleaseType | undefined = params.type
  let hasFeatures = false
  let hasBreakingChanges = false

  if (type == null) {
    const commits = await getCommitsBetween({
      since,
      cwd,
    })
    const flags = summarizeCommits(commits)
    type = bumpFromFlags(maxVersion, flags)
    hasFeatures = flags.hasFeatures
    hasBreakingChanges = flags.hasBreakingChanges
  }

  const nextVersion = inc(maxVersion, type)
  if (nextVersion == null) {
    throw new Error(`Invalid version increment: ${maxVersion} → ${type}`)
  }

  const workspaceVersions = collectVersions(workspace)

  const result: BumpVersionPackage[] = []

  for (const pkg of changedPackages) {
    result.push({
      package: pkg,
      prevVersion: asNonNull(pkg.json.version),
    })
  }

  bumpDependants({
    changedPackages,
    workspace,
    result,
    nextVersion,
    type,
    bumpWithDependants: params.params?.bumpWithDependants,
    workspaceVersions,
  })

  const packagesToBump = [...result.map(it => it.package)]
  if (withRoot) {
    packagesToBump.push(findRootPackage(workspace))
  }

  const nextVersions: Record<string, string> = {}

  for (const pkg of packagesToBump) {
    if (pkg.json.fuman?.ownVersioning) continue

    const newVersion = pkg.json.fuman?.standalone
      ? await nextStandaloneVersion(pkg, cwd)
      : nextVersion

    await writePackageVersion(pkg, newVersion, dryRun)
    nextVersions[asNonNull(pkg.json.name)] = newVersion
  }

  return {
    maxVersion,
    nextVersions,
    changedPackages: result,
    releaseType: type,
    hasBreakingChanges,
    hasFeatures,
  }
}
