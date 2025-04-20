import type { SpawnOptions } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { spawn } from 'cross-spawn'
import { normalizeFilePath } from './path.js'

/** result of {@link exec} */
export interface ExecResult {
  /** stdout of the command */
  stdout: string
  /** stderr of the command */
  stderr: string
  /** exit code of the command */
  exitCode: number
}

export class ExecError extends Error {
  constructor(readonly cmd: string[], readonly result: ExecResult) {
    super(`Command exited with code ${result.exitCode}`, {
      cause: result,
    })
  }
}

/**
 * execute a command and return its result
 *
 * **differences from node's `child_process.exec()`**:
 * - if `options.stdio` is set to `'inherit'`, the command will be printed to the console (unless `options.quiet` is set to `true`)
 * - on non-zero exit code, the promise will be rejected with an {@link ExecError} if `options.throwOnError` is set to `true`
 *
 * @param cmd  command to execute (first element is the command itself, the rest are arguments to it)
 */
export function exec(cmd: string[], options?: SpawnOptions & {
  throwOnError?: boolean
  quiet?: boolean
}): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    if (options?.stdio === 'inherit' && !options.quiet) {
      const cmdStr = cmd.map(it => it.includes(' ') ? `"${it.replace(/"/g, '\\"')}"` : it).join(' ')

      let cwdStr = ''
      if (options?.cwd != null) {
        const normCwd = path.resolve(normalizeFilePath(options.cwd))
        const showCwd = normCwd !== process.cwd()
        cwdStr = showCwd ? `\x1B[;3m${path.relative(process.cwd(), normCwd)}\x1B[;23m ` : ''
      }

      // eslint-disable-next-line no-console
      console.log(`${cwdStr}\x1B[;34m$\x1B[;0m ${cmdStr}`)
    }

    const proc = spawn(cmd[0], cmd.slice(1), {
      stdio: 'pipe',
      ...options,
    })

    const stdout: Uint8Array[] = []
    const stderr: Uint8Array[] = []

    proc.stdout?.on('data', (data) => {
      stdout.push(data as Uint8Array)
    })

    proc.stderr?.on('data', (data) => {
      stderr.push(data as Uint8Array)
    })

    proc.on('error', reject)

    proc.on('close', (code) => {
      if (code !== 0 && options?.throwOnError) {
        reject(new ExecError(cmd, {
          stdout: Buffer.concat(stdout).toString(),
          stderr: Buffer.concat(stderr).toString(),
          exitCode: code ?? -1,
        }))
      }
      resolve({
        stdout: Buffer.concat(stdout).toString(),
        stderr: Buffer.concat(stderr).toString(),
        exitCode: code ?? -1,
      })
    })
  })
}
