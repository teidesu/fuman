import type { CopyOptions } from 'node:fs'
import * as fsp from 'node:fs/promises'

export async function fileExists(path: string): Promise<boolean> {
    try {
        const stat = await fsp.stat(path)
        return stat.isFile()
    } catch {
        return false
    }
}

export async function directoryExists(path: string): Promise<boolean> {
    try {
        const stat = await fsp.stat(path)
        return stat.isDirectory()
    } catch {
        return false
    }
}

export async function tryCopy(src: string, dest: string, options?: CopyOptions): Promise<void> {
    try {
        await fsp.cp(src, dest, options)
    } catch (err: any) {
        // eslint-disable-next-line ts/no-unsafe-member-access
        if (err.code === 'ENOENT') {
            // ignore
        } else {
            throw err
        }
    }
}
