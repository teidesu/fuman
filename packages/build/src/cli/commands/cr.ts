import type { WorkspacePackage } from '../../package-json/collect-package-jsons.js'
import { join } from 'node:path'

import process from 'node:process'

import { asNonNull } from '@fuman/utils'
import { isRunningInGithubActions } from '../../ci/github-actions.js'
import { exec } from '../../misc/exec.js'
import { collectPackageJsons, filterPackageJsonsForPublish } from '../../package-json/collect-package-jsons.js'

import { bc } from './_utils.js'
import { buildPackage } from './build.js'

export async function runContinuousRelease(params: {
    workspaceRoot?: string
    workspace?: WorkspacePackage[]
    distDir?: string
    extraArgs?: string[]
}): Promise<void> {
    const {
        workspaceRoot = process.cwd(),
        workspace = await collectPackageJsons(workspaceRoot, true),
        distDir = 'dist',
        extraArgs = [],
    } = params

    const workspaceWithoutRoot = workspace.filter(pkg => !pkg.root)

    const ordered = filterPackageJsonsForPublish(workspaceWithoutRoot, 'npm')

    if (!isRunningInGithubActions()) {
        throw new Error('cr command is only supported in github actions')
    }

    const distPaths: string[] = []

    for (const pkg of ordered) {
        if (pkg.json.scripts?.build !== undefined) {
            await exec([
                'npm',
                'run',
                'build',
            ], {
                cwd: join(pkg.path),
                stdio: 'inherit',
                throwOnError: true,
            })
        } else {
            await buildPackage({
                workspaceRoot,
                workspace,
                packageName: asNonNull(pkg.json.name),
            })
        }

        distPaths.push(join(pkg.path, distDir))
    }

    if (extraArgs.some(it => it.startsWith('--pnpm'))) {
        console.warn('`--pnpm` flag is not supported and may cause issues, please avoid using it')
    }

    await exec([
        'npx',
        'pkg-pr-new',
        'publish',
        ...extraArgs,
        ...distPaths,
    ], {
        cwd: workspaceRoot,
        throwOnError: true,
        stdio: 'inherit',
    })
}

export const runContinuousReleaseCli = bc.command({
    name: 'cr',
    desc: 'publish the workspace to pkg.pr.new',
    options: {
        root: bc.string()
            .desc('path to the root of the workspace (default: cwd)'),
        distDir: bc.string('dist-dir')
            .desc('directory to publish from, relative to package root (default: dist)'),
        extraArgs: bc.string('extra-args')
            .desc('extra arguments to pass to pkg-pr-new'),
    },
    transform: (args) => {
        return {
            ...args,
            extraArgs: args.extraArgs?.split(' '),
        }
    },
    handler: runContinuousRelease,
})
