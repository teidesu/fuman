import type { PackageJson } from './types.js'

import * as path from 'node:path'

import process from 'node:process'

import { glob } from 'tinyglobby'
import { normalizeFilePath } from '../misc/path.js'
import { parsePackageJsonFromDir, parseWorkspaceRootPackageJson } from './parse.js'

// defaulting to Infinity takes a lot of time on larger workspaces
const maxDepth = process.env.FUMAN_BUILD_MAX_DEPTH !== undefined ? Number(process.env.FUMAN_BUILD_MAX_DEPTH) : 5

/** information about a package in a workspace */
export interface WorkspacePackage {
    /** path to the package root */
    path: string
    /** path to the package.json file (note that it might not be a .json file) */
    packageJsonPath: string
    /** whether this is the root package */
    root: boolean
    /** package.json of the package */
    json: PackageJson
}

/** collect package.jsons from a workspace */
export async function collectPackageJsons(
    workspaceRoot: string | URL,
    includeRoot = false,
): Promise<WorkspacePackage[]> {
    workspaceRoot = normalizeFilePath(workspaceRoot)

    const packageJsons: WorkspacePackage[] = []

    const { path: rootPackageJsonPath, json: rootPackageJson } = await parseWorkspaceRootPackageJson(workspaceRoot)

    if (!rootPackageJson.workspaces) {
        throw new Error('No workspaces found in package.json')
    }

    if (includeRoot) {
        packageJsons.push({
            path: workspaceRoot,
            root: true,
            json: rootPackageJson,
            packageJsonPath: rootPackageJsonPath,
        })
    }

    for (const dir of await glob({
        patterns: rootPackageJson.workspaces,
        cwd: workspaceRoot,
        onlyDirectories: true,
        followSymbolicLinks: true,
        deep: maxDepth,
    })) {
        try {
            const { json, path: packageJsonPath } = await parsePackageJsonFromDir(path.join(workspaceRoot, dir))
            packageJsons.push({
                path: path.join(workspaceRoot, dir),
                root: false,
                packageJsonPath,
                json,
            })
        } catch (err) {
            // eslint-disable-next-line ts/no-unsafe-member-access
            if ((err as any).code === 'ENOENT' || (err as any).cause?.notFound) {
                // not a package, ignore
            } else {
                throw err
            }
        }
    }

    return packageJsons
}

/**
 * filter packages to only include the ones that are to be published
 * to the given registry
 */
export function filterPackageJsonsForPublish(
    packages: WorkspacePackage[],
    registry: 'jsr' | 'npm',
): WorkspacePackage[] {
    const otherRegistry = registry === 'npm' ? 'jsr' : 'npm'
    return packages.filter((pkg) => {
        if (pkg.root) {
            return false
        }

        const fumanConfig = pkg.json.fuman
        if (!fumanConfig) return true

        if (fumanConfig.private) return false
        if (fumanConfig[registry] === 'skip') return false
        if (fumanConfig[otherRegistry] === 'only') return false

        return true
    })
}
