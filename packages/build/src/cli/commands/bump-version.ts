import type { BumpVersionResult } from '../../versioning/bump-version.js'

import process from 'node:process'
import { isRunningInGithubActions, writeGithubActionsOutput } from '../../ci/github-actions.js'
import { getLatestTag } from '../../git/utils.js'
import { collectPackageJsons } from '../../package-json/collect-package-jsons.js'

import { bumpVersion } from '../../versioning/bump-version.js'
import { bc, loadConfig } from './_utils.js'

export function formatBumpVersionResult(result: BumpVersionResult, withReleaseType: boolean): string {
    const lines: string[] = []
    if (withReleaseType) {
        lines.push(`detected release type: ${result.releaseType}`)
        lines.push(`  has breaking changes: ${result.hasBreakingChanges}`)
        lines.push(`  has new features: ${result.hasFeatures}`)
        lines.push('')
    }

    lines.push(`next version: ${result.nextVersion}`)
    lines.push('')

    lines.push('list of changed packages:')
    for (const { package: pkg, because } of result.changedPackages) {
        lines.push(`  ${pkg.json.name}${because ? ` (because of ${because.join(', ')})` : ''}: ${pkg.json.version} → ${result.nextVersion}`)
    }

    return lines.join('\n')
}

export const bumpVersionCli = bc.command({
    name: 'bump-version',
    desc: 'bump the version of changed packages',
    options: {
        root: bc.string()
            .desc('path to the root of the workspace (default: process.cwd())'),
        config: bc.string()
            .desc('path to the build.config.js file'),
        type: bc.string()
            .desc('override type of release (major, minor, patch) (default: auto-detect)')
            .enum('major', 'minor', 'patch', 'auto')
            .default('auto'),
        since: bc.string()
            .desc('starting point for the changelog (default: latest tag)'),
        dryRun: bc.boolean('dry-run')
            .desc('whether to only print the detected changes without actually modifying anything'),
        quiet: bc.boolean()
            .desc('whether to only print the new version number')
            .alias('q'),
    },
    handler: async (args) => {
        const root = args.root ?? process.cwd()
        const releaseType = args.type === 'auto' ? undefined : args.type

        const workspace = await collectPackageJsons(root)
        const config = await loadConfig({
            workspaceRoot: root,
            configPath: args.config,
            require: false,
        })

        const since = args.since ?? (await getLatestTag(root))
        if (since == null) {
            throw new Error('no previous tag found, cannot determine changeset')
        }

        const result = await bumpVersion({
            workspace,
            type: releaseType,
            cwd: root,
            since,
            params: config?.versioning,
            dryRun: args.dryRun,
        })

        if (args.quiet) {
            console.log(result.nextVersion)
        } else {
            console.log(formatBumpVersionResult(result, releaseType == null))
        }

        if (isRunningInGithubActions()) {
            writeGithubActionsOutput('version', result.nextVersion)
            writeGithubActionsOutput('hasBreakingChanges', String(result.hasBreakingChanges))
            writeGithubActionsOutput('hasFeatures', String(result.hasFeatures))
            writeGithubActionsOutput('changedPackages', result.changedPackages.map(it => it.package.json.name).join(','))
        }
    },
})
