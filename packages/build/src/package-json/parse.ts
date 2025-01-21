import * as fsp from 'node:fs/promises'
import path, { extname } from 'node:path'

import * as jsyaml from 'js-yaml'
import * as json5_ from 'json5'

import { fileExists } from '../misc/fs.js'

import { normalizeFilePath } from '../misc/path.js'
import { type PackageJson, PackageJsonSchema } from './types.js'

let json5: typeof json5_ = json5_
if ('default' in json5_) {
    // i LOVE commonjs
    json5 = json5_.default as typeof json5_
}

/** parse a package.json from string */
export function parsePackageJson(packageJson: string, format: 'json' | 'yaml' = 'json'): PackageJson {
    let obj: unknown
    if (format === 'json') {
        obj = json5.parse(packageJson)
    } else {
        obj = jsyaml.load(packageJson)
    }

    return PackageJsonSchema.parse(obj)
}

/** parse a package.json file */
export async function parsePackageJsonFile(packageJsonPath: string | URL): Promise<PackageJson> {
    const path = normalizeFilePath(packageJsonPath)
    const ext = extname(path).slice(1)

    let format: 'json' | 'yaml'
    if (ext === 'json5' || ext === 'jsonc' || ext === 'json') format = 'json'
    else if (ext === 'yml' || ext === 'yaml') format = 'yaml'
    else throw new Error(`Unknown package.json extension: ${ext}`)

    try {
        return parsePackageJson(await fsp.readFile(normalizeFilePath(packageJsonPath), 'utf8'), format)
    } catch (err) {
        throw new Error(`Could not parse package.json at ${packageJsonPath}`, { cause: err })
    }
}

const EXT_OPTIONS = ['json', 'json5', 'jsonc', 'yml', 'yaml']

export async function parsePackageJsonFromDir(dir: string | URL): Promise<{ path: string, json: PackageJson }> {
    dir = normalizeFilePath(dir)
    let packageJsonPath
    for (const ext of EXT_OPTIONS) {
        const tmp = path.join(dir, `package.${ext}`)
        if (await fileExists(tmp)) {
            packageJsonPath = tmp
            break
        }
    }

    if (packageJsonPath == null) {
        throw new Error(`Could not find package.json at ${dir}`, { cause: { notFound: true } })
    }

    return {
        path: packageJsonPath,
        json: await parsePackageJsonFile(packageJsonPath),
    }
}

/** parse the package.json file at the root of the workspace */
export async function parseWorkspaceRootPackageJson(workspaceRoot: string | URL): Promise<{ path: string, json: PackageJson }> {
    workspaceRoot = normalizeFilePath(workspaceRoot)

    const { path: pjPath, json: parsed } = await parsePackageJsonFromDir(workspaceRoot)

    if (!parsed.workspaces) {
        // if we are using pnpm, we are probably using pnpm-workspace.yaml instead
        const pnpmWorkspacePath = path.join(workspaceRoot, 'pnpm-workspace.yaml')
        let yaml
        try {
            yaml = await fsp.readFile(pnpmWorkspacePath, 'utf8')
        } catch (e: any) {
            // eslint-disable-next-line ts/no-unsafe-member-access
            if (e.code !== 'ENOENT') throw e
            return { path: pjPath, json: parsed }
        }

        const workspace = jsyaml.load(yaml) as {
            packages?: string[]
            catalog?: Record<string, string>
            catalogs?: Record<string, Record<string, string>>
        }

        if (!workspace.packages) {
            throw new Error('No packages found in pnpm-workspace.yaml')
        }

        if (workspace.catalog || workspace.catalogs) {
            const catalogs: Record<string, Record<string, string>> = {}
            if (workspace.catalog) {
                catalogs[''] = workspace.catalog
            }
            if (workspace.catalogs) {
                for (const [name, catalog] of Object.entries(workspace.catalogs)) {
                    catalogs[name] = catalog
                }
            }
            parsed.catalogs = catalogs
        }

        parsed.workspaces = workspace.packages
    }

    return { path: pjPath, json: parsed }
}
