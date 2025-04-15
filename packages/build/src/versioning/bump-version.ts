import type { ReleaseType } from 'semver'
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

export async function bumpVersion(params: {
    /** packages for which to generate the changelog */
    workspace: WorkspacePackage[]
    /** previous tag */
    prevTag?: string | null
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
        if (pkg.root) continue

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
        // determine release type
        for (const commit of await getCommitsBetween({
            since,
            cwd,
        })) {
            const parsed = parseConventionalCommit(commit.message)
            if (!parsed) continue

            if (parsed.breaking) hasBreakingChanges = true
            if (parsed.type === 'feat') hasFeatures = true
        }

        const parsedVersion = parse(maxVersion)
        if (!parsedVersion) {
            throw new Error(`Invalid version: ${maxVersion}`)
        }

        if (hasBreakingChanges) {
            if (parsedVersion.major === 0 && parsedVersion.minor === 0) {
                type = 'patch'
            } else if (parsedVersion.major === 0) {
                type = 'minor'
            } else {
                type = 'major'
            }
        } else if (hasFeatures) {
            type = parsedVersion.major === 0 ? 'patch' : 'minor'
        } else {
            type = 'patch'
        }
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

    // make sure that packages that depend on the changed package are also updated if needed
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
                    // dependency on standalone package by version (i.e. from registry). ignore
                    continue
                }
                if (expandedVersion === 'workspace:^') expandedVersion = `^${workspaceVersions[pkgName]}`
                if (expandedVersion === 'workspace:*') expandedVersion = workspaceVersions[pkgName]

                if (!satisfies(nextVersion, expandedVersion)) {
                    if (otherPkg.json.fuman?.ownVersioning) {
                        throw new Error(`package ${otherPkg.json.name}@${otherPkg.json.version} is marked as "own versioning", and will not be compatible with ${pkgName}@${expandedVersion} after bumping. please bump it manually`)
                    }

                    const existing = result.find(pkg => pkg.package.json.name === otherPkg.json.name)
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

    const packagesToBump = [...result.map(it => it.package)]
    if (withRoot) {
        packagesToBump.push(findRootPackage(workspace))
    }

    const nextVersions: Record<string, string> = {}

    let prevTag = params.prevTag

    for (const pkg of packagesToBump) {
        if (pkg.json.fuman?.ownVersioning) continue

        let newVersion = nextVersion

        if (pkg.json.fuman?.standalone) {
            // standalone packages each have their own versioning
            newVersion = asNonNull(pkg.json.version)

            // was this package released before?
            if (prevTag === undefined) {
                prevTag = await getLatestTag(pkg.path)
            }

            if (prevTag != null) {
                const commits = await getCommitsBetween({
                    until: prevTag,
                    cwd,
                    files: [join(pkg.path, 'package.json')],
                })
                if (commits.length > 0) {
                    newVersion = asNonNull(inc(newVersion, type))
                }
            }
        }

        if (!dryRun) {
            const pkgJsonPath = join(pkg.path, 'package.json')
            const pkgJsonText = await fsp.readFile(pkgJsonPath, 'utf8')
            const indent = detectIndent(pkgJsonText).indent || '    '

            const pkgJson = JSON.parse(pkgJsonText) as PackageJson
            pkgJson.version = newVersion

            await fsp.writeFile(pkgJsonPath, `${JSON.stringify(pkgJson, null, indent)}\n`)
        }

        // update the version in the object as well, in case it'll be reused in the future as is
        pkg.json.version = newVersion
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
