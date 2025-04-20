import process from 'node:process'

import { isRunningInGithubActions, writeGithubActionsOutput } from '../../ci/github-actions.js'
import { getLatestTag } from '../../git/utils.js'

import { findProjectChangedPackages } from '../../versioning/collect-files.js'
import { bc, loadConfig } from './_utils.js'

export const findChangedPackagesCli = bc.command({
  name: 'find-changed-packages',
  desc: 'find changed packages between two commits, and output a comma-separated list of package names',
  options: {
    root: bc.string()
      .desc('path to the root of the workspace (default: process.cwd())'),
    since: bc.string()
      .desc('starting point for the changelog (default: latest tag)'),
    until: bc.string()
      .desc('ending point for the changelog (default: HEAD)'),
  },
  handler: async (args) => {
    const root = args.root ?? process.cwd()

    const config = await loadConfig({
      workspaceRoot: root,
      require: false,
    })

    const since = args.since ?? (await getLatestTag(root))
    if (since == null) {
      throw new Error('no previous tag found, cannot determine changeset')
    }

    const list = await findProjectChangedPackages({
      params: config?.versioning,
      root,
      since,
      until: args.until,
    })

    const result = list.map(pkg => pkg.json.name).join(',')
    if (isRunningInGithubActions()) {
      writeGithubActionsOutput('packages', result)
      console.log('Written packages to `packages` output')
    } else {
      console.log(result)
    }
  },
})
