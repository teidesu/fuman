import type { JsrConfig } from './jsr/config.js'
import type { PackageJson } from './package-json/types.js'
import type { VersioningOptions } from './versioning/types.js'

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
}

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
}

export type RootConfig = RootConfigObject | (() => RootConfigObject)
