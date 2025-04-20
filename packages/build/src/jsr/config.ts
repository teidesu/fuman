import type { MaybePromise } from '@fuman/utils'
import type ts from 'typescript'

import type { BuildHookContext } from '../config.js'
import type { WorkspacePackage } from '../package-json/collect-package-jsons.js'

export interface JsrConfig {
  /**
   * jsr build output dir (relative to workspace root)
   *
   * @default "dist"
   */
  outputDir?: string

  /**
   * files to copy from the workspace root directory to the package build directory
   *
   * @default ['LICENSE']
   */
  copyRootFiles?: string[]

  /**
   * files to copy from the package root directory to the package build directory
   *
   * @default ['README.md']
   */
  copyPackageFiles?: string[]

  /**
   * source dir (relative to package root)
   * anything outside this dir will be copied as-is
   * @default "" (i.e. the package root itself)
   */
  sourceDir?: string

  /** globs to exclude from publishing */
  exclude?: string[]

  /** custom predicate for including packages */
  includePackage?: (pkg: WorkspacePackage) => boolean

  /**
   * whether to run `deno publish --dry-run` after generating the workspace
   * to make sure everything is ok
   * @default true
   */
  dryRun?: boolean

  /** hook to run after the deno.json file is generated but before it is written to disk */
  finalizeDenoJson?: (ctx: BuildHookContext, jsr: any) => void

  /** hook to run *after* the build is done, time to do any final modifications to the package contents */
  finalize?: (ctx: BuildHookContext) => MaybePromise<void>

  /** hook that will be run on each file as it is being processed, allowing you to change ast as you wish */
  transformAst?: (ast: ts.SourceFile) => boolean
  /** similar to transformAst, but for the code itself (runs after transformAst) */
  transformCode?: (path: string, code: string) => string

  /**
   * whether to enable pre-processor directives when processing typescript files.
   * this is useful to provide deno-specific typings for stuff.
   *
   * **note**: this is run *before* the transformCode hook, but *after* the transformAst hook
   *
   * supported directives:
   *
   * `<deno-insert>`: inserts the given code at transform time. example:
   * ```ts
   * // <deno-insert>
   * // declare type SharedWorker = never
   * // </deno-insert>
   * ```
   * transforms to:
   * ```ts
   * declare type SharedWorker = never
   * ```
   *
   * `<deno-remove>`: remove the given code at transform time. example:
   * ```ts
   * // <deno-remove>
   * if (self instanceof SharedWorkerGlobalScope) {
   *   // do something
   * }
   * // </deno-remove>
   * ```
   * transforms to: (nothing)
   *
   * `<deno-tsignore>`: insert a `// @ts-ignore` comment when building for deno at the given position
   * example:
   * ```ts
   * // <deno-tsignore>
   * const foo: string = 123
   * ```
   * transforms to:
   * ```ts
   * // @ts-ignore
   * const foo = 123
   * ```
   *
   * @default false
   */
  enableDenoDirectives?: boolean
}
