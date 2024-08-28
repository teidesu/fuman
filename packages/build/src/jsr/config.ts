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
}
