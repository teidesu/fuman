import type { AnyToNever } from '@fuman/utils'
import type { TypeDocOptions } from 'typedoc'
import type { LintConfig } from './cli/commands/lint/config.js'
import type { JsrConfig } from './jsr/config.js'
import type { PackageJson } from './package-json/types.js'
import type { VersioningOptions } from './versioning/types.js'

/** context object that is passed to each build hook */
export interface BuildHookContext {
  /** full path to the output directory */
  outDir: string
  /** full path to the package directory */
  packageDir: string
  /** name of the package being build */
  packageName: string
  /**
   * package.json of the package being build
   * should not be modified unless allowed in the hook docs
   */
  packageJson: PackageJson

  /** whether this is a jsr build */
  jsr: boolean

  /** whether this is a documentation build */
  typedoc: boolean
}

/** root configuration object */
export interface RootConfigObject {
  /**
   * path to vite config to use when building using fuman-build cli,
   * relative to the workspace root
   *
   * @default "vite.config.js"
   */
  viteConfig?: string

  /** jsr-specific configuration */
  jsr?: JsrConfig

  /** configuration for the changelog generator */
  versioning?: VersioningOptions

  /** base configuration for typedoc */
  typedoc?: AnyToNever<Omit<Partial<TypeDocOptions>, 'entryPoints' | 'entryPointStrategy' | 'extends'> & {
    /**
     * **note**: fuman-specific option
     *
     * if passed, docs will be generated for the specified packages only
     */
    includePackages?: string[]

    /**
     * **note**: fuman-specific option
     *
     * list of packages for which the docs should *not* be generated
     */
    excludePackages?: string[]
  }>

  /** `lint` command configuration */
  lint?: LintConfig
}

/** root configuration (either an object or a function that returns an object) */
export type RootConfig = RootConfigObject | (() => RootConfigObject)
