#!/usr/bin/env node
import process from 'node:process'

import { bc } from './commands/_utils.js'
import { buildPackageCli } from './commands/build.js'
import { bumpVersionCli } from './commands/bump-version.js'
import { runContinuousReleaseCli } from './commands/cr.js'
import { generateDocsCli } from './commands/docs.js'
import { findChangedPackagesCli } from './commands/find-changed-packages.js'
import { generateChangelogCli } from './commands/gen-changelog.js'
import { generateDepsGraphCli } from './commands/gen-deps-graph.js'
import { jsrCli } from './commands/jsr.js'
import { publishPackagesCli } from './commands/publish.js'
import { releaseCli } from './commands/release.js'
import { validateWorkspaceDepsCli } from './commands/validate-workspace-deps.js'

await bc.run([
    validateWorkspaceDepsCli,
    generateDepsGraphCli,
    buildPackageCli,
    jsrCli,
    generateChangelogCli,
    findChangedPackagesCli,
    bumpVersionCli,
    publishPackagesCli,
    releaseCli,
    runContinuousReleaseCli,
    generateDocsCli,
], {
    theme: (event) => {
        if (event.type === 'error' && event.violation === 'unknown_error') {
            console.error(event.error)
            process.exit(1)
        }

        return false
    },
})
