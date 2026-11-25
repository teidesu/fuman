import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { loadBuildConfig } from './_config.js'

describe('loadBuildConfig', () => {
  const dirs: string[] = []

  afterEach(async () => {
    await Promise.all(dirs.map(dir => rm(dir, { recursive: true, force: true })))
    dirs.length = 0
  })

  async function tempDir(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'fuman-build-config-'))
    dirs.push(dir)
    return dir
  }

  it('returns undefined when build.config.js is missing', async () => {
    const dir = await tempDir()
    expect(await loadBuildConfig(dir)).toBeUndefined()
  })

  it('loads a present build.config.js', async () => {
    const dir = await tempDir()
    await writeFile(join(dir, 'build.config.js'), 'export default { viteConfig: \'vite.config.ts\' }\n')
    expect(await loadBuildConfig(dir)).toEqual({ viteConfig: 'vite.config.ts' })
  })

  it('throws when a present build.config.js fails to resolve an import', async () => {
    const dir = await tempDir()
    await writeFile(
      join(dir, 'build.config.js'),
      'import \'fuman-missing-build-config-dep\'\nexport default { viteConfig: \'x.js\' }\n',
    )

    await expect(loadBuildConfig(dir)).rejects.toThrow('Could not load build.config.js')
  })
})
