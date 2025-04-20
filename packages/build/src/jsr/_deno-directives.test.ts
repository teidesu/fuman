import { describe, expect, it } from 'vitest'
import { applyDenoDirectives } from './_deno-directives.js'

describe('deno directives', () => {
  it('should apply deno-tsignore', () => {
    expect(applyDenoDirectives(`
      // <deno-tsignore>
      const a = 1
    `)).toBe(`
      /* @ts-ignore */
      const a = 1
    `)
  })

  it('should apply deno-insert', () => {
    expect(applyDenoDirectives(`
      // <deno-insert>
      // const a = 1
      // </deno-insert>
      const b = 2
    `).trim()).toBe('const a = 1\n      \n      const b = 2')
  })

  it('should apply deno-remove', () => {
    expect(applyDenoDirectives(`
      // <deno-remove>
      const a = 1
      // </deno-remove>
      const b = 2
    `).trim()).toBe('const b = 2')
  })

  it('should apply multiple deno-inserts', () => {
    expect(applyDenoDirectives(`
      // <deno-insert>
      // const a = 1
      // </deno-insert>
      // <deno-insert>
      // const b = 2
      // </deno-insert>
      const c = 3
    `).trim()).toBe('const a = 1\n      \n      \n      const b = 2\n      \n      const c = 3')
  })

  it('should apply multiple deno-remove', () => {
    expect(applyDenoDirectives(`
      // <deno-remove>
      const a = 1
      // </deno-remove>
      // <deno-remove>
      const b = 2
      // </deno-remove>
      const c = 3
    `).trim()).toBe('const c = 3')
  })

  it('should apply multiple deno-tsignore', () => {
    expect(applyDenoDirectives(`
      // <deno-tsignore>
      const a = 1
      // <deno-tsignore>
      const b = 2
      const c = 3
    `)).toBe(`
      /* @ts-ignore */
      const a = 1
      /* @ts-ignore */
      const b = 2
      const c = 3
    `)
  })
})
