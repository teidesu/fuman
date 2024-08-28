import { randomUUID } from 'node:crypto'

import { exec } from '../misc/exec.js'

export async function getLatestTag(cwd?: string | URL): Promise<string | null> {
    const res = await exec(['git', 'describe', '--abbrev=0', '--tags'], { cwd })

    if (res.exitCode !== 0) {
        if (res.stderr.match(/^fatal: (?:No names found|No tags can describe)/i)) {
            // no tags found, let's just return the first commit
            return null
        }

        throw new Error(`git describe failed: ${res.stderr}`)
    }

    return res.stdout.trim()
}

export async function getFirstCommit(cwd?: string | URL): Promise<string> {
    return (await exec(['git', 'rev-list', '--max-parents=0', 'HEAD'], {
        cwd,
        throwOnError: true,
    })).stdout.trim()
}

export async function getCurrentCommit(cwd?: string | URL): Promise<string> {
    const res = await exec(['git', 'rev-parse', 'HEAD'], {
        cwd,
        throwOnError: true,
    })
    return res.stdout.trim()
}

export async function getCurrentBranch(cwd?: string | URL): Promise<string> {
    const res = await exec(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], {
        cwd,
        throwOnError: true,
    })
    return res.stdout.trim()
}

export async function findChangedFiles(params: {
    since: string
    /** @default  'HEAD' */
    until?: string
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

export interface CommitInfo {
    hash: string
    author: {
        name: string
        email: string
        date: Date
    }
    committer: {
        name: string
        email: string
        date: Date
    }
    message: string
    description: string
}

export async function getCommitsBetween(params: {
    since: string
    /** @default  'HEAD' */
    until?: string
    cwd?: string | URL
}): Promise<CommitInfo[]> {
    const { since, until = 'HEAD', cwd } = params

    const delim = `---${randomUUID()}---`

    const res = await exec(['git', 'log', `--pretty=format:%H %s%n%an%n%ae%n%aI%n%cn%n%ce%n%cI%n%b%n${delim}`, `${since}..${until}`], {
        cwd,
        throwOnError: true,
    })

    const lines = res.stdout.trim().split('\n')

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

export interface ConventionalCommit {
    type: string
    scope?: string
    breaking: boolean
    subject: string
}

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
