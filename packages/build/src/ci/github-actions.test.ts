import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { EOL, tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { writeGithubActionsOutput } from './github-actions.js'

describe('writeGithubActionsOutput', () => {
  let previous = process.env.GITHUB_OUTPUT
  let dir: string | undefined

  afterEach(async () => {
    if (previous === undefined) delete process.env.GITHUB_OUTPUT
    else process.env.GITHUB_OUTPUT = previous
    if (dir) await rm(dir, { recursive: true, force: true })
    dir = undefined
  })

  async function outputFile(): Promise<string> {
    dir = await mkdtemp(join(tmpdir(), 'fuman-gha-'))
    const file = join(dir, 'github-output')
    process.env.GITHUB_OUTPUT = file
    return file
  }

  it('writes a single-line value as name=value', async () => {
    const file = await outputFile()
    writeGithubActionsOutput('packages', 'a,b')
    expect(await readFile(file, 'utf8')).toBe(`packages=a,b${EOL}`)
  })

  it('puts the closing delimiter on its own line for multiline values', async () => {
    const file = await outputFile()
    writeGithubActionsOutput('notes', `line one${EOL}line two`)

    const written = await readFile(file, 'utf8')
    const lines = written.split(EOL)
    expect(lines[0]).toMatch(/^notes<<---[0-9a-f-]{36}---$/)
    const delim = lines[0].slice('notes<<'.length)
    expect(lines).toEqual([`notes<<${delim}`, 'line one', 'line two', delim, ''])
    expect(written.endsWith(`${EOL}${delim}${EOL}`)).toBe(true)
    expect(written).not.toContain(`two${delim}`)
  })

  it('throws when GITHUB_OUTPUT is not set', () => {
    delete process.env.GITHUB_OUTPUT
    expect(() => writeGithubActionsOutput('x', 'y')).toThrow('GITHUB_OUTPUT is not set')
  })
})
