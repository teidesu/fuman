import type { VersioningOptions } from './types.js'
import { join, relative } from 'node:path'

import process from 'node:process'

import picomatch from 'picomatch'
import { findChangedFiles } from '../git/utils.js'
import { normalizeFilePath } from '../misc/path.js'
import { getTsconfigFiles } from '../misc/tsconfig.js'

import { collectPackageJsons, type WorkspacePackage } from '../package-json/index.js'

export interface ProjectChangedFile {
    /** package to which the file belongs */
    package: WorkspacePackage
    /** path to the file relative to the package root */
    file: string
    /** path to workspace root */
    root: string
}

async function defaultShouldInclude(file: ProjectChangedFile): Promise<boolean> {
    if (!file.file.endsWith('.ts')) return true

    if (file.package == null) return false

    const tsconfigFiles = await getTsconfigFiles(join(file.root, file.package.path))
    return tsconfigFiles.includes(file.file)
}

export async function findProjectChangedFiles(
    params: {
        params?: VersioningOptions
        root?: string | URL
        since: string
        until?: string
    },
): Promise<ProjectChangedFile[]> {
    const {
        params: {
            include,
            exclude = ['**/*.test.ts'],
            shouldInclude = defaultShouldInclude,
        } = {},
        root: root_ = process.cwd(),
        since,
        until,
    } = params

    const root = normalizeFilePath(root_)

    const changed = await findChangedFiles({
        since,
        until,
        cwd: root,
    })

    if (!changed.length) return []

    const packages = await collectPackageJsons(root)
    // update paths to be relative to workspace root
    for (const pkg of packages) {
        pkg.path = relative(root, pkg.path)
    }

    const files: ProjectChangedFile[] = []

    const includeGlobs = include == null ? null : picomatch(include)
    const excludeGlobs = exclude == null ? null : picomatch(exclude)

    for (const file of changed) {
        const pkg = packages.find(pkg => file.startsWith(pkg.path))
        if (!pkg) continue

        const relPath = relative(pkg.path, file)

        if (includeGlobs != null && !includeGlobs(relPath)) continue
        if (excludeGlobs != null && excludeGlobs(relPath)) continue

        const info: ProjectChangedFile = {
            file: relPath,
            package: pkg,
            root,
        }

        if (!(await shouldInclude(info))) continue

        files.push(info)
    }

    return files
}

export async function findProjectChangedPackages(
    params: {
        params?: VersioningOptions
        root?: string | URL
        since: string
        until?: string
    },
): Promise<WorkspacePackage[]> {
    const files = await findProjectChangedFiles(params)

    const set = new Set<WorkspacePackage>()
    for (const file of files) {
        if (file.package != null) set.add(file.package)
    }

    return Array.from(set)
}
