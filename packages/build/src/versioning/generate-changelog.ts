import type { WorkspacePackage } from '../package-json/index.js'

import type { VersioningOptions } from './types.js'

import { join } from 'node:path'
import { asNonNull } from '@fuman/utils'

import { type CommitInfo, type ConventionalCommit, findChangedFiles, getCommitsBetween, parseConventionalCommit } from '../git/utils.js'
import { findProjectChangedFiles } from './collect-files.js'

function defaultOnParseFailed(commit: CommitInfo): void {
    console.warn('[warn] Failed to parse commit message: %s', commit.message)
}

function defaultCommitFormatter(commit: CommitInfo, parsed: ConventionalCommit): string {
    const { breaking } = parsed
    const { hash, message, description } = commit
    let line = `- ${hash}: ${breaking ? '**❗ BREAKING** ' : ''}${message}`

    if (breaking && description) {
        line
                += `\n${
                 commit.description
                    .trim()
                    .split('\n')
                    .map(line => `  ${line}`)
                    .join('\n')}`
    }

    return line
}

function defaultCommitFilter(commit: CommitInfo, parsed: ConventionalCommit): boolean {
    const { type, breaking } = parsed
    if (breaking) return true
    if (!type || ['chore', 'ci', 'docs', 'test'].includes(type)) return false
    return true
}

function defaultPackageCommitsFormatter(packageName: string, commits: Record<string, string>): string {
    return `### ${packageName}\n${Object.values(commits).join('\n')}`
}

/** simple changelog generator based on git commits history */
export async function generateChangelog(params: {
    /** packages for which to generate the changelog */
    workspace: WorkspacePackage[]
    /** root of the git repo */
    cwd?: string | URL
    /** starting point for the changelog (defaults to latest tag) */
    since: string
    /** versioning params */
    params?: VersioningOptions
}): Promise<string> {
    const {
        cwd,
        since,
        params: {
            changelog: {
                onCommitParseFailed = defaultOnParseFailed,
                onCommitsFetched,
                commitFilter = defaultCommitFilter,
                commitFilterWithFiles,
                commitFormatter = defaultCommitFormatter,
                packageCommitsFormatter = defaultPackageCommitsFormatter,
            } = {},
        } = {},
    } = params

    const commitsByPackage: Record<string, Record<string, string>> = {}

    const changedFiles = await findProjectChangedFiles({
        params: params.params ?? {},
        root: cwd,
        since,
    })

    const changedFilesByPackage = new Map<string, WorkspacePackage>()
    for (const file of changedFiles) {
        changedFilesByPackage.set(join(file.package.path, file.file), file.package)
    }

    // at this point `changedFilesByPackage` contains all the files that were
    // changed between `since` and the latest commit, and now we need to
    // go through all the commits and collect the ones that affect the changed files

    const commits = await getCommitsBetween({ since, cwd })
    await onCommitsFetched?.(commits)
    for (const commit of commits) {
        const parsed = parseConventionalCommit(commit.message)

        if (!parsed) {
            onCommitParseFailed(commit)
            continue
        }

        if (!commitFilter(commit, parsed)) continue

        const changed = await findChangedFiles({ since: `${commit.hash}~1`, until: commit.hash, cwd })

        if (commitFilterWithFiles && !commitFilterWithFiles(commit, parsed, changed)) continue

        for (const file of changed) {
            const pkg = changedFilesByPackage.get(file)
            if (!pkg) continue

            const packageName = asNonNull(pkg.json.name)
            if (commitsByPackage[packageName] == null) commitsByPackage[packageName] = {}
            commitsByPackage[packageName][commit.hash] = commitFormatter(commit, parsed, changed)
        }
    }

    let ret = ''

    for (const [pkg, commits] of Object.entries(commitsByPackage)) {
        ret += packageCommitsFormatter(pkg, commits)
        ret += '\n\n'
    }

    return ret
}
