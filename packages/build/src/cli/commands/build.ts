import type { WorkspacePackage } from '../../package-json/collect-package-jsons.js'
import { join } from 'node:path'

import process from 'node:process'
import { exec } from '../../misc/exec.js'
import { collectPackageJsons } from '../../package-json/collect-package-jsons.js'
import { findPackageByName } from '../../package-json/utils.js'

import { bc, loadConfig } from './_utils.js'

export async function buildPackage(params: {
    workspaceRoot: string
    workspace?: WorkspacePackage[]
    packageName: string
    configPath?: string
}): Promise<void> {
    const config = await loadConfig(params)
    const workspacePackages = params.workspace ?? await collectPackageJsons(params.workspaceRoot, true)

    const viteConfig = config?.viteConfig ?? 'vite.config.js'
    const packageRoot = findPackageByName(workspacePackages, params.packageName).path

    await exec(['npx', 'vite', 'build', '--config', join(params.workspaceRoot, viteConfig)], {
        env: {
            ...process.env,
            __FUMAN_INTERNAL_PACKAGES_LIST: JSON.stringify(workspacePackages),
        },
        cwd: packageRoot,
        stdio: 'inherit',
        throwOnError: true,
    })
}

export const buildPackageCli = bc.command({
    name: 'build',
    desc: 'build a package',
    options: {
        config: bc.string('config')
            .desc('path to the build.config.js file'),
        root: bc.string().desc('path to the root of the workspace (default: cwd)'),
        packageName: bc.positional('package-name')
            .desc('name of the package to build')
            .required(),
    },
    handler: async (args) => {
        await buildPackage({
            workspaceRoot: args.root ?? process.cwd(),
            packageName: args.packageName,
            configPath: args.config,
        })
    },
})
