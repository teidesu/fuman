import { LruMap } from '@fuman/utils'

import { exec } from './exec.js'

/** get a full tsconfig for the given directory */
export async function getTsconfigFor(cwd: string): Promise<unknown> {
  const res = await exec(['npx', 'tsc', '--showConfig'], {
    cwd,
    throwOnError: true,
  })

  return JSON.parse(res.stdout)
}

const _tsconfigFilesCache = new LruMap<string, string[]>(32)

/**
 * get the list of files that are included in the tsconfig
 */
export async function getTsconfigFiles(cwd: string): Promise<string[]> {
  const cached = _tsconfigFilesCache.get(cwd)
  if (cached) return cached

  const config = await getTsconfigFor(cwd)

  if (typeof config !== 'object' || config === null) {
    throw new Error('tsconfig.json is not an object')
  }
  if (!('files' in config) || !Array.isArray(config.files)) {
    throw new Error('tsconfig.json > .files is not an array')
  }

  const files = (config.files as string[]).map(file => file.replace(/^\.\//, ''))

  _tsconfigFilesCache.set(cwd, files)

  return files
}
