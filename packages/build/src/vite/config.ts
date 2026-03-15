import type { AnyToNever, MaybePromise } from '@fuman/utils'
import type { TypeDocOptions } from 'typedoc'

import type { Plugin, UserConfig } from 'vite'
import type { BuildHookContext } from '../config.js'
import type { JsrConfig } from '../jsr/config.js'

export interface CustomBuildConfigObject {
  /** jsr-specific configuration */
  jsr?: JsrConfig

  /** any additional vite plugins to be added before the fuman-build plugin */
  pluginsPre?: Plugin[]
  /** any additional vite plugins to be added after the fuman-build plugin */
  pluginsPost?: Plugin[]

  /** vite config to be merged into the base config */
  viteConfig?: UserConfig

  /**
   * a predicate to determine if the entrypoint should be copied to the target directory as-is, without being processed by vite
   *
   * - `name` is the name of the entrypoint (e.g. `./foo.json`)
   * - `target` is the target path (e.g. `./src/foo.json`)
   *
   * the default implementation skips any non-javascript entrypoints, which is particularly useful for json and wasm files
   *
   * @default (name, target) => !!target.match(/(?<!\.d)\.([mc]?[jt]sx?)$/i)
   */
  shouldCopyEntrypoint?: (name: string, target: string) => boolean

  /**
   * hook to run *before* anything is done to the package.json file
   * you **can** modify the .packageJson property of the context
   *
   * this hook is called before vite build has started,
   * and as such `.outDir` is not available yet
   */
  preparePackageJson?: (ctx: BuildHookContext) => void

  /**
   * hook to run *after* the package.json file is finalized,
   * right before it is written to disk
   * you **can** modify the .packageJson property of the context
   */
  finalizePackageJson?: (ctx: BuildHookContext) => MaybePromise<void>

  /**
   * hook to run *after* the build is done,
   * time to do any final modifications to the package contents
   */
  finalize?: (ctx: BuildHookContext) => MaybePromise<void>

  /** package-specific configuration for typedoc */
  typedoc?:
    | AnyToNever<Partial<TypeDocOptions>>
    | ((current: AnyToNever<Partial<TypeDocOptions>>) => AnyToNever<Partial<TypeDocOptions>>)
}

export type CustomBuildConfig = CustomBuildConfigObject | (() => CustomBuildConfigObject)
