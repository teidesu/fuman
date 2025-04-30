import type { MaybeArray, MaybePromise } from '@fuman/utils'
import type { PluginOption } from 'vite'

import type { BuildHookContext } from '../config.js'
import type { WorkspacePackage } from '../package-json/collect-package-jsons.js'

import type { CustomBuildConfigObject } from './config.js'
import * as fsp from 'node:fs/promises'
import { join, relative } from 'node:path'

import process from 'node:process'
import { asNonNull, assertStartsWith, deepMerge, parallelMap } from '@fuman/utils'
import { glob } from 'tinyglobby'
import { loadBuildConfig } from '../misc/_config.js'
import { directoryExists, fileExists, tryCopy } from '../misc/fs.js'
import { normalizeFilePath } from '../misc/path.js'
import { collectPackageJsons } from '../package-json/collect-package-jsons.js'
import { processPackageJson, removeCommonjsExports } from '../package-json/process-package-json.js'
import { collectVersions } from '../package-json/utils.js'

export async function fumanBuild(params: {
  root: URL | string

  /**
   * package root, will be passed to vite's `root` option
   *
   * @default `process.cwd()`
   */
  packageRoot?: string

  /**
   * files to copy from the workspace root directory to the build directory
   *
   * @default ['LICENSE']
   */
  copyRootFiles?: string[]

  /**
   * files to copy from the package root directory to the build directory
   *
   * @default ['README.md']
   */
  copyPackageFiles?: string[]

  /**
   * the modifiable part of the chunk file name
   * there will be a prefix of `chunks/[format]/` and a suffix of `.js`
   * @default `[hash]`
   */
  chunkFileName?: string

  /**
   * workspace dependencies that are bundled with the library,
   * and as such shouldn't present in the final package.json
   */
  bundledWorkspaceDeps?: MaybeArray<string | RegExp>

  rootFieldsToCopy?: string[]

  /** when true, will automatically add `sideEffects: false` to generated package.json-s */
  autoSideEffectsFalse?: boolean

  /**
   * hook to run *before* anything is done to the package.json file
   * you **can** modify the .packageJson property of the context
   *
   * this hook is called before vite build has started,
   * and as such `.outDir` is not available yet
   * (note: this hook is run *before* package-level hooks)
   */
  preparePackageJson?: (ctx: BuildHookContext) => void

  /**
   * hook to run *after* the package.json file is finalized,
   * right before it is written to disk
   * you **can** modify the .packageJson property of the context
   * (note: this hook is run *before* package-level hooks)
   */
  finalizePackageJson?: (ctx: BuildHookContext) => MaybePromise<void>

  /**
   * hook to run *after* the build is done,
   * time to do any final modifications to the package contents
   * (note: this hook is run *before* package-level hooks)
   */
  finalize?: (ctx: BuildHookContext) => MaybePromise<void>

  /**
   * when using with `vite-plugin-dts`, use this flag instead of
   * their `insertTypesEntry` option to insert the types entry,
   * as their implementation doesn't always yield the correct result
   *
   * @default false
   */
  insertTypesEntry?: boolean

  /**
   * when using with `vite-plugin-dts`, this value should match `entryRoot`
   * value passed to the `vite-plugin-dts` plugin
   */
  typesEntryRoot?: string
}): Promise<PluginOption[]> {
  const {
    copyRootFiles = ['LICENSE'],
    copyPackageFiles = ['README.md'],
    chunkFileName = '[hash]',
    rootFieldsToCopy,
    packageRoot = process.cwd(),
    bundledWorkspaceDeps,
    autoSideEffectsFalse = false,
    insertTypesEntry = false,
    typesEntryRoot,
  } = params
  const rootDir = normalizeFilePath(params.root)

  const fixedVersion = process.env.__FUMAN_INTERNAL_FIXED_VERSION

  // when vite is started from our cli, we already have the list of packages,
  // so we can avoid the expensive collectPackageJsons call
  const cachedWorkspace = process.env.__FUMAN_INTERNAL_PACKAGES_LIST
  const allPackageJsons = cachedWorkspace !== undefined ? JSON.parse(cachedWorkspace) as WorkspacePackage[] : await collectPackageJsons(rootDir, true)
  const rootPackageJson = allPackageJsons.find(it => it.root)?.json
  if (!rootPackageJson) {
    throw new Error('Could not find root package.json')
  }

  const ourPackageJson = allPackageJsons.find(it => it.path.replace(/\/$/g, '') === packageRoot.replace(/\/$/g, ''))?.json
  if (!ourPackageJson) {
    throw new Error(`Could not find package.json for ${packageRoot}`)
  }

  if (rootPackageJson === ourPackageJson) {
    // we are running from root. either vite is used for something other than build
    // (e.g. tests), or the user is trying to build the root package (which is not supported)
    // in the former case we just no-op, in the latter we throw

    return [
      {
        name: 'vite-plugin-fuman-build',
        config(ctx, env) {
          if (env.command === 'build' && env.mode === 'production') {
            throw new Error('[@fuman/build] Cannot build the root package from root. Please change cwd to the package directory, or pass it via `packageRoot` option.')
          }
        },
      },
    ]
  }

  const workspaceVersions = collectVersions(allPackageJsons)
  let isNoop = false

  const packageConfig = await loadBuildConfig<CustomBuildConfigObject>(packageRoot)

  const hookContext: BuildHookContext = {
    outDir: '',
    packageDir: packageRoot,
    packageName: asNonNull(ourPackageJson.name),
    packageJson: ourPackageJson,
    jsr: false,
    typedoc: false,
  }

  params.preparePackageJson?.(hookContext)
  packageConfig?.preparePackageJson?.(hookContext)

  const { packageJson, entrypoints } = processPackageJson({
    packageJson: ourPackageJson,
    rootPackageJson,
    workspaceVersions,
    bundledWorkspaceDeps: (bundledWorkspaceDeps === undefined || Array.isArray(bundledWorkspaceDeps) ? bundledWorkspaceDeps : [bundledWorkspaceDeps])
      ?.map(dep => typeof dep === 'string' ? new RegExp(dep) : dep),
    rootFieldsToCopy,
    fixedVersion,
  })

  hookContext.packageJson = packageJson

  if (packageJson.sideEffects == null) {
    if (autoSideEffectsFalse) {
      packageJson.sideEffects = false
    } else {
      console.warn('[@fuman/build] package.json for %s has no sideEffects field, this may cause issues with tree-shaking', packageJson.name)
      console.warn('[@fuman/build] (tip: set `autoSideEffectsFalse: true` in plugin params to add it automatically)')
    }
  }

  let buildCjs = false
  let buildDir!: string

  return [
    ...(packageConfig?.pluginsPre ?? []),
    {
      name: 'vite-plugin-fuman-build',
      async config(config, env) {
        if (env.command !== 'build') {
          isNoop = true
          return null
        }

        buildDir = join(packageRoot, config.build?.outDir ?? 'dist')
        hookContext.outDir = buildDir

        const libOptions = config?.build?.lib
        const libOptionsCustom = packageConfig?.viteConfig?.build?.lib
        const outputFormats
                    = (libOptions === false ? undefined : libOptions?.formats)
                      ?? (libOptionsCustom === false ? undefined : libOptionsCustom?.formats)
                      ?? ['es', 'cjs']

        buildCjs = outputFormats.includes('cjs')

        return deepMerge({
          root: packageRoot,
          build: {
            emptyOutDir: true,
            target: 'es2022',
            minify: false,
            rollupOptions: {
              output: {
                minifyInternalExports: false,
                chunkFileNames:
                  buildCjs
                    ? `chunks/[format]/${chunkFileName}.js`
                    : `chunks/${chunkFileName}.js`,
              },
            },
            lib: {
              entry: entrypoints,
              formats: outputFormats,
            },
          },
        }, packageConfig?.viteConfig ?? {})
      },
      async closeBundle() {
        if (isNoop) return

        if (!buildCjs) {
          removeCommonjsExports(packageJson.exports as Record<string, unknown>)
        }

        await params.finalizePackageJson?.(hookContext)
        await packageConfig?.finalizePackageJson?.(hookContext)

        await fsp.writeFile(join(buildDir, 'package.json'), JSON.stringify(packageJson, null, 4))

        for (const file of copyRootFiles) {
          await tryCopy(join(rootDir, file), join(buildDir, file))
        }
        for (const file of copyPackageFiles) {
          await tryCopy(join(packageRoot, file), join(buildDir, file))
        }

        if (insertTypesEntry) {
          // generate .d.ts for entrypoints
          for (const [name, value] of Object.entries(entrypoints)) {
            const dTsFile = join(buildDir, `${name}.d.ts`)
            if (await fileExists(dTsFile)) continue

            let entrypointFile = value
            if (!value.endsWith('.ts')) continue

            if (typesEntryRoot == null) {
              assertStartsWith(entrypointFile, './')
              // "The default is the smallest public path for all source files"
              // since we don't have a list of source files, assume the smallest public path
              // is *inside* the package, and try removing the folders one by one
              while (true) {
                if (await fileExists(join(buildDir, entrypointFile.replace(/\.ts$/, '.d.ts')))) break
                const idx = entrypointFile.indexOf('/', 2)
                if (idx === -1) {
                  throw new Error(`Could not find d.ts for entrypoint ${entrypointFile}, please pass typesEntryRoot explicitly`)
                }
                entrypointFile = `./${entrypointFile.slice(idx + 1)}`
              }
            } else {
              const fullEntrypointFile = join(packageRoot, entrypointFile)
              entrypointFile = relative(typesEntryRoot, fullEntrypointFile)
              if (!entrypointFile.startsWith('.')) {
                entrypointFile = `./${entrypointFile}`
              }
            }

            entrypointFile = entrypointFile.replace(/\.ts$/, '.js')

            await fsp.writeFile(dTsFile, `export * from ${JSON.stringify(entrypointFile)}`)
          }
        }

        if (buildCjs) {
          if (await directoryExists(join(buildDir, 'chunks/cjs'))) {
            // write {"type":"commonjs"} into chunks/cjs so that node doesn't complain
            const cjsFile = join(buildDir, 'chunks/cjs/package.json')
            await fsp.writeFile(cjsFile, JSON.stringify({ type: 'commonjs' }))
          }

          // generate .d.cts files
          await parallelMap(await glob('**/*.d.ts', { cwd: buildDir }), async (file) => {
            const fullPath = join(buildDir, file)
            await fsp.cp(fullPath, fullPath.replace(/\.d\.ts$/, '.d.cts'))
          })
        }

        await params.finalize?.(hookContext)
        await packageConfig?.finalize?.(hookContext)
      },
      ...(packageConfig?.pluginsPost ?? []),
    },
  ]
}
