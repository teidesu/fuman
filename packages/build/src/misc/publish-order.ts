import type { WorkspacePackage } from '../package-json/collect-package-jsons.js'
import { asNonNull } from '@fuman/utils'

export function sortWorkspaceByPublishOrder(packages: WorkspacePackage[]): WorkspacePackage[] {
    const workspacePackages = new Map<string, WorkspacePackage>()
    for (const pkg of packages) {
        workspacePackages.set(asNonNull(pkg.json.name), pkg)
    }

    const dependencies: Record<string, string[]> = {}

    for (const pkg of packages) {
        if (pkg.json.name == null) continue

        const list: string[] = []

        for (const key of ['dependencies', 'peerDependencies'] as const) {
            const deps = pkg.json[key]
            if (!deps) continue

            for (const name in deps) {
                if (workspacePackages.has(name)) {
                    list.push(name)
                }
            }
        }

        dependencies[pkg.json.name] = list
    }

    const order = determinePublishOrder(dependencies)

    const res: WorkspacePackage[] = []
    for (const name of order) {
        res.push(asNonNull(workspacePackages.get(name)))
    }
    return res
}

export function determinePublishOrder(dependencies: Record<string, string[]>): string[] {
    const result: string[] = []

    const visited = new Set<string>()
    const visiting = new Set<string>()

    function visit(name: string) {
        if (visited.has(name)) {
            return
        }

        if (visiting.has(name)) {
            throw new Error(`Circular dependency detected: ${name}`)
        }

        visiting.add(name)

        for (const dep of dependencies[name] ?? []) {
            visit(dep)
        }

        visiting.delete(name)
        visited.add(name)
        result.push(name)
    }

    for (const name in dependencies) {
        visit(name)
    }

    return result
}
