import type { SpawnOptions } from 'node:child_process'
import { spawn } from 'node:child_process'

export interface ExecResult {
    stdout: string
    stderr: string
    exitCode: number
}

export function exec(cmd: string[], options?: SpawnOptions & { throwOnError?: boolean }): Promise<ExecResult> {
    return new Promise((resolve, reject) => {
        if (options?.stdio === 'inherit') {
            // eslint-disable-next-line no-console
            console.log('\x1B[;34m$\x1B[;0m', cmd.map(it => it.includes(' ') ? `"${it.replace(/"/g, '\\"')}"` : it).join(' '))
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
                reject(new Error(`Command exited with code ${code}`, {
                    cause: {
                        stderr: Buffer.concat(stderr).toString(),
                        exitCode: code,
                        cmd,
                    },
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
