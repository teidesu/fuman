import { resolve } from 'node:path'
import process from 'node:process'
import { describe, expect, it } from 'vitest'

import { runContinuousReleaseCli } from './cr.js'

describe('runContinuousReleaseCli', () => {
  it('maps --root onto workspaceRoot for the handler', () => {
    const mapped = runContinuousReleaseCli.transform({
      root: '/tmp/ws',
      extraArgs: '--foo',
      onlyChanged: false,
    })

    expect(mapped.workspaceRoot).toBe('/tmp/ws')
    expect(mapped.extraArgs).toEqual(['--foo'])
  })

  it('defaults workspaceRoot to cwd when --root is omitted', () => {
    const mapped = runContinuousReleaseCli.transform({
      onlyChanged: false,
    })

    expect(mapped.workspaceRoot).toBe(process.cwd())
  })

  it('resolves a relative --root against cwd', () => {
    const mapped = runContinuousReleaseCli.transform({
      root: 'packages/build',
      onlyChanged: false,
    })

    expect(mapped.workspaceRoot).toBe(resolve(process.cwd(), 'packages/build'))
  })
})
