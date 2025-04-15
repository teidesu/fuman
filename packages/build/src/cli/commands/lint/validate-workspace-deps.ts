import type { WorkspacePackage } from '../../../package-json/collect-package-jsons.js'

import type { LintConfig } from './config.js'

import { satisfies, subset, valid, validRange } from 'semver'
import { collectPackageJsons } from '../../../package-json/collect-package-jsons.js'

/** information about a mismatch between a package and its dependencies */
export interface ExternalDepsError {
    type: 'external'
    /** package name where the mismatch occurred */
    package: string
    /** name of the mismatched dependency */
    dependency: string
    /** version of the mismatched dependency */
    version: string
    /** type of dependency (`dependencies`, `devDependencies`, etc) */
    at: string

    /** package name where the dependency was originally declared */
    otherPackage: string
    /** original version of the dependency */
    otherVersion: string
}

export interface InternalDepsError {
    type: 'internal'
    /** package name where the mismatch occurred */
    package: string
    /** name of the mismatched dependency */
    dependency: string
    /**
     * sub-type of the error
     * - not_workspace_proto: internal dependencies must be linked with workspace: protocol
     * - standalone_dep: non-standalone packages cannot depend on standalone packages
     * - not_workspace_dep: `workspace:` protocol is used to link to a package not found in the workspace
     */
    subtype: 'not_workspace_proto' | 'standalone_dep' | 'not_workspace_dep'
}

export type WorkspaceDepsError = ExternalDepsError | InternalDepsError

/**
 * validate the external dependencies of a workspace
 */
export async function validateWorkspaceDeps(params: {
    workspaceRoot: string | URL
    packages?: WorkspacePackage[]
    config?: LintConfig
}): Promise<WorkspaceDepsError[]> {
    const {
        workspaceRoot,
        config: {
            includeRoot,
            externalDependencies: {
                enabled: externalDependenciesEnabled = true,
                skipPeerDependencies: externalDependenciesSkipPeerDependencies = false,
                shouldSkip: externalDependenciesShouldSkip,
            } = {},
        } = {},
    } = params

    const packages = params.packages ?? (await collectPackageJsons(workspaceRoot, includeRoot))
    const packagesMap = new Map(packages.map(pj => [pj.json.name, pj]))

    const versions: Record<string, Record<string, string>> = {}
    const errors: WorkspaceDepsError[] = []

    for (const pkg of packages) {
        const pj = pkg.json
        if (pj.name === undefined) {
            throw new Error('package.json without name is not supported')
        }

        for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const) {
            const deps = pj[field]
            if (!deps) continue

            for (const [name, version] of Object.entries(deps)) {
                if (packagesMap.has(name)) {
                    // internal dependency

                    const otherPkg = packagesMap.get(name)
                    const otherPkgStandalone = Boolean(otherPkg?.json.fuman?.standalone)

                    if (!otherPkgStandalone && !version.startsWith('workspace:')) {
                        errors.push({
                            type: 'internal',
                            package: pj.name,
                            dependency: name,
                            subtype: 'not_workspace_proto',
                        })
                        continue
                    }

                    if (!pj.fuman?.standalone && otherPkgStandalone && version.startsWith('workspace:')) {
                        errors.push({
                            type: 'internal',
                            package: pj.name,
                            dependency: name,
                            subtype: 'standalone_dep',
                        })
                    }

                    continue
                }

                // external dependency

                if (version.startsWith('workspace:')) {
                    errors.push({
                        type: 'internal',
                        package: pj.name,
                        dependency: name,
                        subtype: 'not_workspace_dep',
                    })
                    continue
                }

                if (!externalDependenciesEnabled) continue
                if (field === 'peerDependencies' && externalDependenciesSkipPeerDependencies) continue
                if (externalDependenciesShouldSkip?.({ package: pkg, dependency: name, version, field })) continue

                if (versions[name] === undefined) {
                    versions[name] = {}
                }

                for (const [pkgName, pkgDepVersions] of Object.entries(versions[name])) {
                    let ok = true
                    if (pkgDepVersions.match(/^(?:https?:\/\/|catalog:)/)) {
                        ok = version === pkgDepVersions
                    } else if (valid(version) != null) {
                        ok = satisfies(version, pkgDepVersions)
                    } else if (validRange(version) != null) {
                        ok = subset(pkgDepVersions, version)
                    }

                    if (!ok) {
                        errors.push({
                            type: 'external',
                            package: pj.name,
                            dependency: name,
                            version,
                            at: field,
                            otherPackage: pkgName,
                            otherVersion: pkgDepVersions,
                        })
                    }
                }

                versions[name][pj.name] = version
            }
        }
    }

    return errors
}
