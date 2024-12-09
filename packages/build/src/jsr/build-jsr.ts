import type { UnsafeMutable } from '@fuman/utils'
import type { BuildHookContext } from '../config.js'
import type { WorkspacePackage } from '../package-json/collect-package-jsons.js'
import type { CustomBuildConfigObject } from '../vite/index.js'
import type { JsrConfig } from './config.js'
import * as fsp from 'node:fs/promises'
import { join, relative } from 'node:path'
import { asNonNull, asyncPool } from '@fuman/utils'
import { glob } from 'tinyglobby'
import ts from 'typescript'
import { loadBuildConfig } from '../misc/_config.js'
import { exec } from '../misc/exec.js'
import { tryCopy } from '../misc/fs.js'
import { normalizeFilePath } from '../misc/path.js'
import { processPackageJson } from '../package-json/process-package-json.js'

import { collectVersions, findPackageByName, findRootPackage } from '../package-json/utils.js'
import { packageJsonToDeno } from './deno-json.js'

function mergeArrays<T>(a: T[] | undefined, b: T[] | undefined, defaultValue: T[] = []): T[] {
    if (!a) return b ?? defaultValue
    if (!b) return a

    return [...a, ...b]
}

export async function runJsrBuild(params: {
    packageName: string
    workspacePackages: WorkspacePackage[]
    rootConfig?: JsrConfig
}): Promise<void> {
    const {
        packageName,
        workspacePackages,
        rootConfig,
    } = params

    const ourPackage = findPackageByName(workspacePackages, packageName)
    const rootPackage = findRootPackage(workspacePackages)

    const packageRoot = ourPackage.path
    const workspaceRoot = rootPackage.path
    const outDir = join(packageRoot, normalizeFilePath(rootConfig?.outputDir ?? 'dist'))

    const packageConfig = await loadBuildConfig<CustomBuildConfigObject>(packageRoot)

    const srcDir = join(packageRoot, normalizeFilePath(packageConfig?.jsr?.sourceDir ?? rootConfig?.sourceDir ?? ''))

    const excludeFiles = mergeArrays(rootConfig?.exclude, packageConfig?.jsr?.exclude)

    await fsp.rm(outDir, { recursive: true, force: true })
    await fsp.mkdir(outDir, { recursive: true })

    // we can't fsp.cp because the source dir might contain dist
    await asyncPool(await fsp.readdir(srcDir), async (file) => {
        const src = join(srcDir, file)
        if (src === outDir) return

        await fsp.cp(src, join(outDir, file), { recursive: true })
    })

    const printer = ts.createPrinter()
    const tsFiles = await glob('**/*.ts', {
        cwd: outDir,
        ignore: excludeFiles,
    })

    const badImports: string[] = []

    // once @typescript/api-extractor works properly with multiple entrypoints, we could probably
    // use it to optionally rollup everything into a single .ts file
    await asyncPool(tsFiles, async (filename) => {
        const fullFilePath = join(outDir, filename)

        let fileContent = await fsp.readFile(fullFilePath, 'utf8')
        let changed = false

        // validate imports + replace .js extensions with .ts while we're at it
        const file = ts.createSourceFile(filename, fileContent, ts.ScriptTarget.ESNext, true)
        let changedTs = false

        for (const imp of file.statements) {
            if (!ts.isImportDeclaration(imp) && !ts.isExportDeclaration(imp)) {
                continue
            }

            if (!imp.moduleSpecifier || !ts.isStringLiteral(imp.moduleSpecifier)) {
                continue
            }

            const mod = imp.moduleSpecifier.text

            if (mod[0] !== '.') {
                // external module
                continue
            }

            if (mod.endsWith('.js')) {
                changedTs = true
                ;(imp as UnsafeMutable<ts.ImportDeclaration>).moduleSpecifier = ts.factory.createStringLiteral(
                    mod.replace(/\.js$/, '.ts'),
                )
            } else {
                // this is not valid and *will* fail when publishing, as this requires --unstable-sloppy-imports
                // ideally this should be errored by eslint, but just as an another precaution
                badImports.push(`  from ${mod} at ${join(srcDir, filename)}`)
            }
        }

        if (rootConfig?.transformAst?.(file)) {
            changedTs = true
        }
        if (packageConfig?.jsr?.transformAst?.(file)) {
            changedTs = true
        }

        if (changedTs) {
            fileContent = printer.printFile(file)
            changed = true
        }

        if (rootConfig?.transformCode || packageConfig?.jsr?.transformCode) {
            const origFileContent = fileContent

            if (rootConfig?.transformCode) {
                fileContent = rootConfig.transformCode(filename, fileContent)
            }
            if (packageConfig?.jsr?.transformCode) {
                fileContent = packageConfig.jsr.transformCode(filename, fileContent)
            }

            if (fileContent !== origFileContent) {
                changed = true
            }
        }

        if (changed) {
            await fsp.writeFile(fullFilePath, fileContent)
        }
    })

    if (badImports.length > 0) {
        throw new Error(`Found ${badImports.length} invalid imports (you must specify .js extension):\n${badImports.join('\n')}`)
    }

    const hookContext: BuildHookContext = {
        outDir: '',
        packageDir: ourPackage.path,
        packageName: asNonNull(ourPackage.json.name),
        packageJson: ourPackage.json,
        jsr: true,
        typedoc: false,
    }

    packageConfig?.preparePackageJson?.(hookContext)

    const workspaceVersions = collectVersions(workspacePackages)

    const { packageJson, packageJsonOrig } = processPackageJson({
        packageJson: ourPackage.json,
        rootPackageJson: rootPackage.json,
        workspaceVersions,
        // since there's no bundling, we can't drop any deps.
        // we *could* copy them from node_modules and add to the import map,
        // but maybe sometime later
        bundledWorkspaceDeps: [],
        rootFieldsToCopy: ['license'],
    })

    const denoJson = packageJsonToDeno({
        packageJson,
        packageJsonOrig,
        workspaceVersions,
        buildDirName: relative(packageRoot, outDir),
        baseDir: relative(packageRoot, srcDir),
        exclude: excludeFiles,
    })

    await fsp.writeFile(join(outDir, 'deno.json'), JSON.stringify(denoJson, null, 4))

    // copy aux files
    for (const file of mergeArrays(rootConfig?.copyRootFiles, packageConfig?.jsr?.copyRootFiles, ['LICENSE'])) {
        await tryCopy(join(workspaceRoot, file), join(outDir, file), { recursive: true })
    }
    for (const file of mergeArrays(rootConfig?.copyPackageFiles, packageConfig?.jsr?.copyPackageFiles, ['README.md'])) {
        await tryCopy(join(packageRoot, file), join(outDir, file), { recursive: true })
    }

    if (!packageConfig?.jsr?.dryRun && !rootConfig?.dryRun) {
        await exec(['deno', 'publish', '--dry-run', '-q', '--allow-dirty'], {
            cwd: outDir,
            stdio: 'inherit',
            throwOnError: true,
        })
    }
}
