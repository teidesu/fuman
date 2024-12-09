import type { BuildHookContext, RootConfigObject } from '../../config.js'
import type { WorkspacePackage } from '../../package-json/collect-package-jsons.js'
import type { CustomBuildConfigObject } from '../../vite/config.js'
import process from 'node:process'
import { asNonNull } from '@fuman/utils'
import * as td from 'typedoc'
import { loadBuildConfig } from '../../misc/_config.js'
import { collectPackageJsons } from '../../package-json/collect-package-jsons.js'
import { processPackageJson } from '../../package-json/process-package-json.js'
import { bc } from './_utils.js'

const CUSTOM_ROOT_FIELDS: string[] = [
    'includePackages',
    'excludePackages',
] as const satisfies (keyof NonNullable<RootConfigObject['typedoc']>)[]

// some sensible defaults for a truly zero-config experience
const DEFAULT_CONFIG: Partial<td.TypeDocOptions> = {
    includeVersion: true,
    validation: {
        notExported: true,
        invalidLink: true,
        notDocumented: false,
    },
    excludePrivate: true,
    excludeExternals: true,
    excludeInternal: true,
    exclude: [
        '**/*/node_modules',
        '**/*.test.ts',
        '**/*.test-utils.ts',
    ],
}

class FumanTypedocReader implements td.OptionsReader {
    readonly name = '@fuman/build'
    readonly order = 0 // before any other readers
    readonly supportsPackages = true

    private _workspace?: WorkspacePackage[]
    private _rootConfig?: RootConfigObject

    constructor(readonly workspaceRoot: string) {}

    private _forwardOptions(options: td.Options, config: Partial<td.TypeDocOptions>, cwd: string): void {
        for (const [key, val] of Object.entries(config)) {
            if (CUSTOM_ROOT_FIELDS.includes(key)) continue
            options.setValue(key, val, cwd)
        }
    }

    async read(options: td.Options, logger: td.Logger, cwd: string): Promise<void> {
        if (cwd === this.workspaceRoot) {
            const config = await loadBuildConfig<RootConfigObject>(cwd)

            this._rootConfig = config

            const data = config?.typedoc
            if (data != null) this._forwardOptions(options, data, cwd)

            // generate entrypoints for entryPointStrategy: 'packages',
            options.setValue('entryPointStrategy', 'packages')

            this._workspace = await collectPackageJsons(cwd)

            const entrypoints: string[] = []
            for (const pkg of this._workspace) {
                const pkgName = asNonNull(pkg.json.name)
                if (data?.includePackages && !data.includePackages.includes(pkgName)) continue
                if (data?.excludePackages?.includes(pkgName)) continue
                // entrypoints are generated from .exports, so if there aren't any we can't generate docs for the package
                // however user might want to generate docs for the package even if there are no exports, e.g. by manually setting entrypoints
                if (!pkg.json.exports && !data?.includePackages?.includes(pkgName)) continue

                entrypoints.push(pkg.path)
            }

            options.setValue('entryPoints', entrypoints, cwd)
            return
        }

        const rootConfig = asNonNull(this._rootConfig)
        // forward "base" options
        if (rootConfig.typedoc != null) this._forwardOptions(options, rootConfig.typedoc, cwd)

        // handle entrypoints
        const pkg = asNonNull(this._workspace?.find(pkg => pkg.path.replace(/\/$/, '') === cwd.replace(/\/$/, '')))
        const pkgConfig = await loadBuildConfig<CustomBuildConfigObject>(cwd)

        const hookContext: BuildHookContext = {
            outDir: '',
            packageDir: pkg.path,
            packageName: asNonNull(pkg.json.name),
            packageJson: pkg.json,
            jsr: false,
            typedoc: true,
        }

        pkgConfig?.preparePackageJson?.(hookContext)
        const { entrypoints } = processPackageJson({ packageJson: pkg.json, onlyEntrypoints: true })
        options.setValue('entryPoints', Object.values(entrypoints), cwd)

        // forward package-specific typedoc options
        if (!pkgConfig?.typedoc) return

        let data = pkgConfig.typedoc
        if (typeof data === 'function') {
            data = data(options.getRawValues())
        }

        this._forwardOptions(options, data, cwd)
    }
}

export async function generateDocs(params: {
    workspaceRoot: string
}): Promise<void> {
    // roughly based on https://github.com/TypeStrong/typedoc/blob/master/src/lib/cli.ts
    const app = await td.Application.bootstrapWithPlugins(DEFAULT_CONFIG, [
        new FumanTypedocReader(params.workspaceRoot),
        new td.TSConfigReader(),
        new td.TypeDocReader(),
    ])

    const project = await app.convert()
    if (!project) {
        throw new Error('Could not convert to typedoc project')
    }

    if (
        app.options.getValue('treatWarningsAsErrors')
        && app.logger.hasWarnings()
    ) {
        throw new Error('There were warnings while converting the project')
    }

    const preValidationWarnCount = app.logger.warningCount
    app.validate(project)
    const hadValidationWarnings = app.logger.warningCount !== preValidationWarnCount

    if (app.logger.hasErrors()) {
        throw new Error('There were errors while validating the project')
    }

    if (
        hadValidationWarnings
        && (app.options.getValue('treatWarningsAsErrors')
            || app.options.getValue('treatValidationWarningsAsErrors'))
    ) {
        throw new Error('There were warnings while validating the project')
    }

    if (app.options.getValue('emit') === 'none') return

    await app.generateOutputs(project)

    if (app.logger.hasErrors()) {
        throw new Error('There were errors while generating the outputs')
    }
    if (
        app.options.getValue('treatWarningsAsErrors')
        && app.logger.hasWarnings()
    ) {
        throw new Error('There were warnings while generating the outputs')
    }
}

export const generateDocsCli = bc.command({
    name: 'typedoc',
    desc: 'generate docs using typedoc',
    options: {
        root: bc.string().desc('path to the root of the workspace (default: cwd)'),
    },
    handler: async (args) => {
        await generateDocs({
            workspaceRoot: args.root ?? process.cwd(),
        })
    },
})
