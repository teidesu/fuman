import { randomUUID } from 'node:crypto'

import { exec } from '../misc/exec.js'

/**
 * get the latest tag in the repository
 * @param cwd  override the current working directory
 */
export async function getLatestTag(cwd?: string | URL): Promise<string | null> {
    const res = await exec(['git', 'describe', '--abbrev=0', '--tags'], { cwd })

    if (res.exitCode !== 0) {
        if (res.stderr.match(/^fatal: (?:No names found|No tags can describe)/i)) {
            return null
        }

        throw new Error(`git describe failed: ${res.stderr}`)
    }

    return res.stdout.trim()
}

/**
 * get hash of the first commit in the repository
 * @param cwd  override the current working directory
 */
export async function getFirstCommit(cwd?: string | URL): Promise<string> {
    return (await exec(['git', 'rev-list', '--max-parents=0', 'HEAD'], {
        cwd,
        throwOnError: true,
    })).stdout.trim()
}

/**
 * get hash of the current commit
 * @param cwd  override the current working directory
 */
export async function getCurrentCommit(cwd?: string | URL): Promise<string> {
    const res = await exec(['git', 'rev-parse', 'HEAD'], {
        cwd,
        throwOnError: true,
    })
    return res.stdout.trim()
}

/**
 * get name of the current branch
 * @param cwd  override the current working directory
 */
export async function getCurrentBranch(cwd?: string | URL): Promise<string> {
    const res = await exec(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], {
        cwd,
        throwOnError: true,
    })
    return res.stdout.trim()
}

export async function gitTagExists(tag: string, cwd?: string | URL): Promise<boolean> {
    const res = await exec(['git', 'tag', '--list', tag], {
        cwd,
        throwOnError: true,
    })
    return res.stdout.trim() !== ''
}

/**
 * find changed files between two commits
 *
 * @returns  list of changed files, relative to the repository root
 */
export async function findChangedFiles(params: {
    /** starting point for the diff */
    since: string
    /**
     * ending point for the diff
     *
     * @default  'HEAD'
     */
    until?: string

    /** override the current working directory */
    cwd?: string | URL
}): Promise<string[]> {
    const { since, until = 'HEAD', cwd } = params
    const res = await exec(['git', 'diff', '--name-only', since, until], {
        cwd,
        throwOnError: true,
    })

    const files = res.stdout.trim().split('\n')
    if (files.length === 1 && files[0] === '') {
        return []
    }
    return files
}

/** information about a commit */
export interface CommitInfo {
    /** full hash of the commit */
    hash: string
    /** author of the commit */
    author: {
        /** name of the author */
        name: string
        /** email of the author */
        email: string
        /** date of the commit */
        date: Date
    }
    /** committer of the commit */
    committer: {
        /** name of the committer */
        name: string
        /** email of the committer */
        email: string
        /** date of the commit */
        date: Date
    }
    /** commit message */
    message: string
    /** commit description */
    description: string
}

/**
 * get information about commits between two commits (both ends inclusive)
 *
 * @returns  list of commits, in reverse chronological order
 */
export async function getCommitsBetween(params: {
    /** starting point for the diff */
    since?: string
    /** only include commits that modified these files */
    files?: string[]
    /**
     * ending point for the diff
     * @default  'HEAD'
     */
    until?: string
    /** override the current working directory */
    cwd?: string | URL
}): Promise<CommitInfo[]> {
    const { since, until = 'HEAD', cwd, files } = params

    const delim = `---${randomUUID()}---`

    const res = await exec([
        'git',
        'log',
        `--pretty=format:%H %s%n%an%n%ae%n%aI%n%cn%n%ce%n%cI%n%b%n${delim}`,
        since ? `${since}..${until}` : until,
        ...(files?.length ? ['--', ...files] : []),
    ], {
        cwd,
        throwOnError: true,
    })

    const lines = res.stdout.trim().split('\n')
    if (lines.length === 1 && lines[0] === '') return []

    const items: CommitInfo[] = []

    let current = null

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        if (line === delim) {
            if (current) items.push(current)
            current = null
        } else if (current) {
            if (current.description) current.description += '\n'
            current.description += line
        } else {
            const [hash, ...msg] = line.split(' ')
            const authorName = lines[++i]
            const authorEmail = lines[++i]
            const authorDate = lines[++i]
            const committerName = lines[++i]
            const committerEmail = lines[++i]
            const committerDate = lines[++i]

            current = {
                hash,
                author: {
                    name: authorName,
                    email: authorEmail,
                    date: new Date(authorDate),
                },
                committer: {
                    name: committerName,
                    email: committerEmail,
                    date: new Date(committerDate),
                },
                message: msg.join(' '),
                description: '',
            }
        }
    }

    if (current) items.push(current)

    return items.reverse()
}

/** information about a conventional commit */
export interface ConventionalCommit {
    /** type of the commit (e.g. `feat`, `fix`, etc) */
    type: string
    /** scope of the commit (i.e. "scope" in `feat(scope): subject`) */
    scope?: string
    /** whether the commit is marked as breaking with an exclamation mark */
    breaking: boolean
    /** subject of the commit */
    subject: string
}

/** parse a conventional commit message */
export function parseConventionalCommit(msg: string): ConventionalCommit | null {
    const match = msg.match(/^(\w+)(?:\(([^)]+)\))?(!?): (.+)$/)

    if (!match) return null

    const [, type, scope, breaking, subject] = match

    return {
        type,
        scope,
        breaking: Boolean(breaking),
        subject,
    }
}
