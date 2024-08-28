import type { MaybePromise } from '@fuman/utils'
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
}

export type CustomBuildConfig = CustomBuildConfigObject | (() => CustomBuildConfigObject)
