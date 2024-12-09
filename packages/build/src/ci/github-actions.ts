import { randomUUID } from 'node:crypto'
import { appendFileSync } from 'node:fs'
import { EOL } from 'node:os'
import process from 'node:process'

/** are we running in github actions? */
export function isRunningInGithubActions(): boolean {
    return Boolean(process.env.GITHUB_ACTIONS)
}

/** get the value of a github actions input */
export function getGithubActionsInput(name: string): string | undefined {
    const input = process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`]
    if (input === undefined) return undefined

    return input.trim()
}

/** set the value of a github actions output */
export function writeGithubActionsOutput(name: string, value: string): void {
    if (process.env.GITHUB_OUTPUT === undefined) {
        throw new Error('GITHUB_OUTPUT is not set')
    }

    if (!value.includes(EOL)) {
        appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}${EOL}`, 'utf8')
        return
    }

    const delim = `---${randomUUID()}---${EOL}`

    appendFileSync(process.env.GITHUB_OUTPUT, `${name}<<${delim}${value}${delim}`, 'utf8')
}
