import type { PackageJson } from './types.js'

const DEFAULT_FIELDS_TO_COPY_ROOT = ['license', 'author', 'contributors', 'homepage', 'repository', 'bugs']

export function processPackageJson(params: {
    packageJson: PackageJson
    onlyEntrypoints?: boolean
    workspaceVersions?: Record<string, string>
    bundledWorkspaceDeps?: RegExp[]
    rootPackageJson?: PackageJson
    rootFieldsToCopy?: string[]
    fixedVersion?: string
}): {
        packageJson: PackageJson
        packageJsonOrig: PackageJson
        entrypoints: Record<string, string>
    } {
    const {
        packageJson: packageJsonOrig,
        onlyEntrypoints = false,
        workspaceVersions,
        rootPackageJson,
        rootFieldsToCopy = DEFAULT_FIELDS_TO_COPY_ROOT,
        bundledWorkspaceDeps,
        fixedVersion,
    } = params
    const packageJson = structuredClone(packageJsonOrig)
    const entrypoints: Record<string, string> = {}

    if (!onlyEntrypoints) {
    // copy common fields from root
        for (const field of rootFieldsToCopy) {
            if (rootPackageJson?.[field] != null && packageJson[field] == null) {
            // eslint-disable-next-line ts/no-unsafe-assignment
                packageJson[field] = rootPackageJson[field]
            }
        }

        const newScripts: Record<string, string> = {}

        if (packageJson.scripts && Array.isArray(packageJson.fuman?.keepScripts)) {
            for (const script of packageJson.fuman.keepScripts) {
                if (typeof script !== 'string') continue
                if (script in packageJson.scripts) continue

                newScripts[script] = packageJson.scripts[script]
            }
            delete packageJson.keepScripts
        }

        packageJson.scripts = newScripts
        delete packageJson.devDependencies
        delete packageJson.private

        if (packageJson.fuman?.distOnlyFields) {
            Object.assign(packageJson, packageJson.fuman.distOnlyFields)
            delete packageJson.distOnlyFields
        }

        function replaceWorkspaceDependencies(field: keyof PackageJson) {
            if (packageJson[field] == null) return

            const dependencies = packageJson[field] as Record<string, string>

            for (const name of Object.keys(dependencies)) {
                const value = dependencies[name]

                if (value.startsWith('workspace:')) {
                    if (bundledWorkspaceDeps) {
                        let found = false

                        for (const dep of bundledWorkspaceDeps) {
                            if (dep.test(name)) {
                                delete dependencies[name]
                                found = true
                                break
                            }
                        }

                        if (found) continue
                    }

                    if (value !== 'workspace:^' && value !== 'workspace:*') {
                        throw new Error(
                        `Cannot replace workspace dependency ${name} with ${value} - only workspace:^ and * are supported`,
                        )
                    }
                    if (workspaceVersions?.[name] == null) {
                        throw new Error(`Cannot replace workspace: dependency ${name} not found in workspace`)
                    }

                    if (fixedVersion != null) {
                        dependencies[name] = fixedVersion
                        continue
                    }

                    const workspaceVersion = workspaceVersions?.[name]
                    const depVersion = value === 'workspace:*' ? workspaceVersion : `^${workspaceVersion}`
                    dependencies[name] = depVersion
                }
            }
        }

        replaceWorkspaceDependencies('dependencies')
        replaceWorkspaceDependencies('devDependencies')
        replaceWorkspaceDependencies('peerDependencies')
        replaceWorkspaceDependencies('optionalDependencies')

        // tool-specific fields
        delete packageJson.typedoc
        delete packageJson.eslintConfig
        delete packageJson.eslintIgnore
        delete packageJson.prettier
        delete packageJson.fuman
    }

    if (packageJson.exports != null) {
        let exports = packageJson.exports as Record<string, string>
        if (typeof exports === 'string') {
            exports = { '.': exports }
        }
        if (typeof exports !== 'object') {
            throw new TypeError('package.json exports must be an object')
        }

        const newExports: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(exports)) {
            if (typeof value !== 'string') {
                throw new TypeError(`package.json exports value must be a string: ${key}`)
            }

            // .wasm files are copied as-is
            if (value.endsWith('.wasm')) {
                newExports[key] = value
                continue
            }

            let entrypointName = key.replace(/^\.(?:\/|$)/, '').replace(/\.js$/, '')
            if (entrypointName === '') entrypointName = 'index'

            entrypoints[entrypointName] = value
            // todo: we should probably not announce `require` imports if we don't build for cjs
            newExports[key] = {
                import: {
                    types: `./${entrypointName}.d.ts`,
                    default: `./${entrypointName}.js`,
                },
                require: {
                    types: `./${entrypointName}.d.cts`,
                    default: `./${entrypointName}.cjs`,
                },
            }
        }

        packageJson.exports = newExports
    }

    if (packageJson.bin != null) {
        const newBin: Record<string, string> = {}
        for (const [key, value] of Object.entries(packageJson.bin as Record<string, string>)) {
            if (typeof value !== 'string') {
                throw new TypeError(`package.json bin value must be a string: ${key}`)
            }

            let entrypointName = key.replace(/^\.(?:\/|$)/, '').replace(/\.js$/, '')
            if (entrypointName === '') entrypointName = 'index'

            entrypoints[entrypointName] = value
            newBin[key] = `${entrypointName}.js`
        }

        packageJson.bin = newBin
    }

    return {
        packageJsonOrig,
        packageJson,
        entrypoints,
    }
}
