import { z } from 'zod'

export interface PackageJson {
    name?: string
    type?: 'module' | 'commonjs'
    version?: string
    private?: boolean
    description?: string
    packageManager?: string
    license?: string
    homepage?: string
    repository?: (string | {
        type: string
        url: string
    })
    keywords?: string[]
    catalogs?: Record<string, Record<string, string>>
    workspaces?: string[]
    scripts?: Record<string, string>
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
    peerDependencies?: Record<string, string>
    optionalDependencies?: Record<string, string>
    bundledDependencies?: Record<string, string>
    engines?: Record<string, string>
    pnpm?: {
        overrides: Record<string, string>
    }
    /** fuman-specific package.json fields */
    fuman?: {
        /**
         * whether the package should be published to jsr
         * (skip – it won't be published to jsr, only – it will only be published to jsr)
         */
        jsr?: 'skip' | 'only'
        /**
         * whether the package should be published to npm
         * (skip – it won't be published to npm, only – it will only be published to npm)
         */
        npm?: 'skip' | 'only'
        /** by default @fuman/build strips all scripts, but you can keep some of them by passing their names here */
        keepScripts?: string[]
        /**
         * any additional fields that will be shallowly merged into the resulting package.json.
         * for more complex modifications than shallow merging, consider using build.config.js
         */
        distOnlyFields?: Record<string, unknown>
        /**
         * whether this package has its own versioning scheme
         * (be careful with this option! this might break cross-release semver compatibility)
         */
        ownVersioning?: boolean
        /** whether this package should not be published */
        private?: boolean
    }

    [key: string]: any
}

export const PackageJsonSchema: z.AnyZodObject = z.object({
    name: z.string(),
    type: z.union([
        z.literal('module'),
        z.literal('commonjs'),
    ]),
    version: z.string(),
    private: z.boolean(),
    description: z.string(),
    packageManager: z.string(),
    license: z.string(),
    homepage: z.string(),
    repository: z.union([
        z.string(),
        z.object({
            type: z.string(),
            url: z.string(),
        }),
    ]).transform((val) => {
        if (typeof val === 'string') {
            return { type: 'git', url: val }
        }

        return val
    }),
    keywords: z.array(z.string()),
    workspaces: z.array(z.string()),
    scripts: z.record(z.string()),
    dependencies: z.record(z.string()),
    devDependencies: z.record(z.string()),
    peerDependencies: z.record(z.string()),
    optionalDependencies: z.record(z.string()),
    bundledDependencies: z.array(z.string()),
    engines: z.record(z.string()),
    pnpm: z.object({
        overrides: z.record(z.string()),
    }).partial(),
    fuman: z.object({
        jsr: z.union([
            z.literal('skip'),
            z.literal('only'),
        ]),
        npm: z.union([
            z.literal('skip'),
            z.literal('only'),
        ]),
        keepScripts: z.array(z.string()),
        distOnlyFields: z.record(z.unknown()),
        ownVersioning: z.boolean(),
        private: z.boolean(),
    }).partial(),
    // todo: properly type this
    exports: z.any(),
}).passthrough().partial()
