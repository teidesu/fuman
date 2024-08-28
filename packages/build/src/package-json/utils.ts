import type { WorkspacePackage } from './collect-package-jsons.js'

export function findPackageByName(packages: WorkspacePackage[], name: string): WorkspacePackage {
    const pkg = packages.find(it => it.json.name === name)
    if (!pkg) {
        throw new Error(`Could not find package.json for ${name}`)
    }
    return pkg
}

export function findRootPackage(packages: WorkspacePackage[]): WorkspacePackage {
    const pkg = packages.find(it => it.root)
    if (!pkg) {
        throw new Error('Could not find package.json for workspace root')
    }
    return pkg
}

export function collectVersions(packages: WorkspacePackage[]): Record<string, string> {
    const versions: Record<string, string> = {}

    for (const pkg of packages) {
        if (pkg.root || pkg.json.name == null || pkg.json.version == null) continue
        versions[pkg.json.name] = pkg.json.version
    }

    return versions
}
