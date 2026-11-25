import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const downloadJsrPackage = vi.fn()
const exec = vi.fn(async () => ({ stdout: '', stderr: '', exitCode: 0 }))

vi.mock('./utils/jsr.js', () => ({
  downloadJsrPackage,
}))

vi.mock('../misc/exec.js', () => ({
  exec,
}))

const { populateFromUpstream } = await import('./populate.js')

async function jsrPackage(params: {
  dir: string
  name: string
  version: string
  source: string
}): Promise<string> {
  const path = join(params.dir, params.name.replace('/', '__'))
  await mkdir(path, { recursive: true })
  await writeFile(join(path, 'jsr.json'), JSON.stringify({
    name: params.name,
    version: params.version,
    exports: './mod.ts',
  }))
  await writeFile(join(path, 'mod.ts'), params.source)
  return path
}

describe('populateFromUpstream', () => {
  const dirs: string[] = []

  afterEach(async () => {
    downloadJsrPackage.mockReset()
    exec.mockReset()
    exec.mockImplementation(async () => ({ stdout: '', stderr: '', exitCode: 0 }))
    await Promise.all(dirs.map(dir => rm(dir, { recursive: true, force: true })))
    dirs.length = 0
  })

  it('downloads transitive deps in later batches before publishing', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'fuman-jsr-populate-'))
    dirs.push(dir)

    const leaf = await jsrPackage({
      dir,
      name: '@std/leaf',
      version: '1.0.0',
      source: 'export const n = 1\n',
    })
    const mid = await jsrPackage({
      dir,
      name: '@std/mid',
      version: '1.0.0',
      source: 'import "jsr:@std/leaf@1.0.0"\nexport const n = 2\n',
    })
    const root = await jsrPackage({
      dir,
      name: '@std/root',
      version: '1.0.0',
      source: 'import "jsr:@std/mid@1.0.0"\nexport const n = 3\n',
    })

    downloadJsrPackage.mockImplementation(async (spec: { packageName: string }) => {
      if (spec.packageName === '@std/root') return root
      if (spec.packageName === '@std/mid') return mid
      if (spec.packageName === '@std/leaf') return leaf
      throw new Error(`unexpected package ${spec.packageName}`)
    })

    await populateFromUpstream({
      downstream: 'http://127.0.0.1:8000',
      packages: ['@std/root@1.0.0'],
      quiet: true,
    })

    const published = exec.mock.calls.map(call => (call[1] as { cwd: string }).cwd)
    expect(published).toEqual([leaf, mid, root])
  })
})
