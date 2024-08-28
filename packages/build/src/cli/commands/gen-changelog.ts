import process from 'node:process'

import { isRunningInGithubActions, writeGithubActionsOutput } from '../../ci/github-actions.js'
import { getLatestTag } from '../../git/utils.js'
import { collectPackageJsons } from '../../package-json/collect-package-jsons.js'

import { generateChangelog } from '../../versioning/generate-changelog.js'
import { bc, loadConfig } from './_utils.js'

export const generateChangelogCli = bc.command({
    name: 'gen-changelog',
    desc: 'generate a changelog for the workspace',
    options: {
        only: bc.string()
            .desc('comma-separated list of packages to include'),
        root: bc.string()
            .desc('path to the root of the workspace (default: process.cwd())'),
        config: bc.string('config')
            .desc('path to the build.config.js file'),
        since: bc.string()
            .desc('starting point for the changelog (default: latest tag)'),
    },
    handler: async (args) => {
        const root = args.root ?? process.cwd()
        const config = await loadConfig({
            workspaceRoot: root,
            configPath: args.config,
            require: false,
        })

        let workspacePackages = await collectPackageJsons(root, false)
        if (args.only !== undefined) {
            const only = new Set(args.only.split(',').map(s => s.trim()))
            // eslint-disable-next-line ts/no-non-null-assertion
            workspacePackages = workspacePackages.filter(pkg => only.has(pkg.json.name!))
        }

        const since = args.since ?? (await getLatestTag(root))
        if (since == null) {
            throw new Error('no previous tag found, cannot determine changeset')
        }

        const changelog = await generateChangelog({
            workspace: workspacePackages,
            cwd: root,
            since,
            params: config?.versioning,
        })

        if (isRunningInGithubActions()) {
            writeGithubActionsOutput('changelog', changelog)
            console.log('Written changelog to `changelog` output')
        } else {
            console.log(changelog)
        }
    },
})
