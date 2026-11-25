import type { WorkspacePackage } from '../package-json/collect-package-jsons.js'

import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('./utils/jsr.js', () => ({
  jsrCheckVersion: vi.fn(async () => false),
}))

const { jsrCreatePackages } = await import('./create-packages.js')

function workspacePackage(name: string): WorkspacePackage {
  return {
    path: `/tmp/${name}`,
    packageJsonPath: `/tmp/${name}/package.json`,
    root: false,
    json: { name, version: '1.0.0' },
  }
}

describe('jsrCreatePackages', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('prints a create URL with the unscoped name intact', async () => {
    const logs: string[] = []
    vi.spyOn(console, 'log').mockImplementation((message?: unknown) => {
      logs.push(String(message ?? ''))
    })

    await jsrCreatePackages({
      workspaceRoot: '/tmp/ws',
      workspacePackages: [workspacePackage('foo')],
      registry: 'https://jsr.example',
    })

    expect(logs.join('\n')).toContain('https://jsr.example/create?scope=foo&package=undefined')
    expect(logs.join('\n')).not.toContain('scope=oo')
  })

  it('strips @ from a scoped name in the create URL', async () => {
    const logs: string[] = []
    vi.spyOn(console, 'log').mockImplementation((message?: unknown) => {
      logs.push(String(message ?? ''))
    })

    await jsrCreatePackages({
      workspaceRoot: '/tmp/ws',
      workspacePackages: [workspacePackage('@acme/pkg')],
      registry: 'https://jsr.example',
    })

    expect(logs.join('\n')).toContain('https://jsr.example/create?scope=acme&package=pkg')
  })
})
