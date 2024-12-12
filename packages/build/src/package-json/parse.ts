import * as fsp from 'node:fs/promises'
import path from 'node:path'

import * as jsyaml from 'js-yaml'

import { normalizeFilePath } from '../misc/path.js'

import { type PackageJson, PackageJsonSchema } from './types.js'

/** parse a package.json from string */
export function parsePackageJson(packageJson: string): PackageJson {
    return PackageJsonSchema.parse(JSON.parse(packageJson))
}

/** parse a package.json file */
export async function parsePackageJsonFile(packageJsonPath: string | URL): Promise<PackageJson> {
    return parsePackageJson(await fsp.readFile(normalizeFilePath(packageJsonPath), 'utf8'))
}

/** parse the package.json file at the root of the workspace */
export async function parseWorkspaceRootPackageJson(workspaceRoot: string | URL): Promise<PackageJson> {
    workspaceRoot = normalizeFilePath(workspaceRoot)
    const packageJsonPath = path.join(workspaceRoot, 'package.json')
    const parsed = await parsePackageJsonFile(packageJsonPath)

    if (!parsed.workspaces) {
        // if we are using pnpm, we are probably using pnpm-workspace.yaml instead
        const pnpmWorkspacePath = path.join(workspaceRoot, 'pnpm-workspace.yaml')
        let yaml
        try {
            yaml = await fsp.readFile(pnpmWorkspacePath, 'utf8')
        } catch (e: any) {
            // eslint-disable-next-line ts/no-unsafe-member-access
            if (e.code !== 'ENOENT') throw e
            return parsed
        }

        const workspace = jsyaml.load(yaml) as {
            packages?: string[]
        }

        if (!workspace.packages) {
            throw new Error('No packages found in pnpm-workspace.yaml')
        }

        return {
            ...parsed,
            workspaces: workspace.packages,
        }
    }

    return parsed
}
