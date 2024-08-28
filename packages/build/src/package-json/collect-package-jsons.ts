import type { PackageJson } from './types.js'

import * as path from 'node:path'

import { glob } from 'tinyglobby'

import { normalizeFilePath } from '../misc/path.js'
import { parsePackageJsonFile, parseWorkspaceRootPackageJson } from './parse.js'

export interface WorkspacePackage {
    path: string
    root: boolean
    json: PackageJson
}

export async function collectPackageJsons(
    workspaceRoot: string | URL,
    includeRoot = false,
): Promise<WorkspacePackage[]> {
    workspaceRoot = normalizeFilePath(workspaceRoot)

    const packageJsons: WorkspacePackage[] = []

    const rootPackageJson = await parseWorkspaceRootPackageJson(workspaceRoot)

    if (!rootPackageJson.workspaces) {
        throw new Error('No workspaces found in package.json')
    }

    if (includeRoot) {
        packageJsons.push({
            path: workspaceRoot,
            root: true,
            json: rootPackageJson,
        })
    }

    for (const dir of await glob(rootPackageJson.workspaces, {
        cwd: workspaceRoot,
        onlyDirectories: true,
        followSymbolicLinks: true,
    })) {
        try {
            const packageJson = await parsePackageJsonFile(path.join(workspaceRoot, dir, 'package.json'))
            packageJsons.push({
                path: path.join(workspaceRoot, dir),
                root: false,
                json: packageJson,
            })
        } catch (err) {
            // eslint-disable-next-line ts/no-unsafe-member-access
            if ((err as any).code === 'ENOENT') {
                // not a package, ignore
            } else {
                throw err
            }
        }
    }

    return packageJsons
}

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
