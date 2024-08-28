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

import { getCommitsBetween, parseConventionalCommit } from '../git/utils.js'
import { collectVersions } from '../package-json/utils.js'
import { findProjectChangedPackages } from './collect-files.js'

export interface BumpVersionPackage {
    /** info about the package */
    package: WorkspacePackage
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
    nextVersion: string
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
}): Promise<BumpVersionResult> {
    const {
        workspace,
        all,
        cwd = process.cwd(),
        since,
        dryRun = false,
    } = params

    let maxVersion: string | null = null
    for (const pkg of workspace) {
        const version = asNonNull(pkg.json.version)

        if (pkg.json.fuman?.ownVersioning) {
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
        ? workspace
        : await findProjectChangedPackages({
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
        if (pkg.json.fuman?.ownVersioning) continue

        result.push({ package: pkg })
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
                            because: [pkgName],
                        })
                    }
                    break
                }
            }
        }
    }

    if (!dryRun) {
        for (const { package: pkg } of result) {
            const pkgJsonPath = join(pkg.path, 'package.json')
            const pkgJsonText = await fsp.readFile(pkgJsonPath, 'utf8')
            const indent = detectIndent(pkgJsonText).indent || '    '

            const pkgJson = JSON.parse(pkgJsonText) as PackageJson
            pkgJson.version = nextVersion

            await fsp.writeFile(pkgJsonPath, `${JSON.stringify(pkgJson, null, indent)}\n`)
        }
    }

    return {
        maxVersion,
        nextVersion,
        changedPackages: result,
        releaseType: type,
        hasBreakingChanges,
        hasFeatures,
    }
}
