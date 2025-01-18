import process from 'node:process'

import { satisfies } from 'semver'

import { collectPackageJsons } from '../../package-json/collect-package-jsons.js'

import { bc } from './_utils.js'

/** information about a mismatch between a package and its dependencies */
export interface WorkspaceDepsError {
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

/**
 * validate the external dependencies of a workspace
 */
export async function validateWorkspaceDeps(params: {
    /** path to the workspace root */
    workspaceRoot: string | URL
    /**
     * whether to also validate the root package.json
     *
     * @default true
     */
    includeRoot?: boolean

    /**
     * whether to skip validating dependencies of other workspace packages
     *
     * @default true
     */
    skipWorkspaceDeps?: boolean
}): Promise<WorkspaceDepsError[]> {
    const {
        workspaceRoot,
        includeRoot = true,
        skipWorkspaceDeps = true,
    } = params

    const pjs = await collectPackageJsons(workspaceRoot, includeRoot)
    const workspacePackages = new Set(skipWorkspaceDeps ? pjs.map(pj => pj.json.name) : [])

    const versions: Record<string, Record<string, string>> = {}
    const errors: WorkspaceDepsError[] = []

    for (const { json: pj } of pjs) {
        if (pj.name === undefined) {
            throw new Error('package.json without name is not supported')
        }

        for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const) {
            const deps = pj[field]
            if (!deps) continue

            for (const [name, version] of Object.entries(deps)) {
                if (workspacePackages.has(name)) continue
                if (version.startsWith('workspace:')) continue

                if (versions[name] === undefined) {
                    versions[name] = {}
                }

                for (const [pkgName, pkgDepVersions] of Object.entries(versions[name])) {
                    if (
                        (pkgDepVersions.match(/^https?:\/\//) && version !== pkgDepVersions)
                        || !satisfies(version, pkgDepVersions)
                    ) {
                        errors.push({
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

export const validateWorkspaceDepsCli = bc.command({
    name: 'validate-workspace-deps',
    desc: 'validate the external dependencies of a workspace',
    options: {
        includeRoot: bc.boolean('include-root')
            .desc('whether to also validate the root package.json')
            .default(false),
        noSkipWorkspaceDeps: bc.boolean('no-skip-workspace-deps')
            .desc('whether to not skip validating dependencies of other workspace packages'),
        root: bc.string().desc('path to the root of the workspace (default: cwd)'),
        withErrorCode: bc.boolean('with-error-code')
            .desc('whether to exit with a non-zero code if there are mismatches'),
    },
    handler: async (args) => {
        const errors = await validateWorkspaceDeps({
            workspaceRoot: args.root ?? process.cwd(),
            includeRoot: args.includeRoot,
            skipWorkspaceDeps: !args.noSkipWorkspaceDeps,
        })

        if (errors.length > 0) {
            console.error('⚠️ Found external dependencies mismatch:')
            for (const error of errors) {
                console.error(`  - at ${error.package}: ${error.at} has ${error.dependency}@${error.version}, but ${error.otherPackage} has @${error.otherVersion}`)
            }
            if (args.withErrorCode) {
                process.exit(1)
            }
        } else {
            console.log('✅ All external dependencies match!')
        }
    },
})
