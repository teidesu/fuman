import type { UnsafeMutable } from '@fuman/utils'
import type { BuildHookContext } from '../config.js'
import type { WorkspacePackage } from '../package-json/collect-package-jsons.js'
import type { CustomBuildConfigObject } from '../vite/config.js'
import type { JsrConfig } from './config.js'
import * as fsp from 'node:fs/promises'
import { join, relative } from 'node:path'
import process from 'node:process'
import { asyncPool } from '@fuman/utils'
import { glob } from 'tinyglobby'
import ts from 'typescript'
import { loadBuildConfig } from '../misc/_config.js'
import { exec } from '../misc/exec.js'
import { tryCopy } from '../misc/fs.js'
import { normalizeFilePath } from '../misc/path.js'
import { collectPackageJsons, filterPackageJsonsForPublish } from '../package-json/collect-package-jsons.js'
import { processPackageJson } from '../package-json/process-package-json.js'
import { collectVersions, findRootPackage } from '../package-json/utils.js'
import { packageJsonToDeno } from './deno-json.js'

function mergeArrays<T>(a: T[] | undefined, b: T[] | undefined, defaultValue: T[] = []): T[] {
    if (!a) return b ?? defaultValue
    if (!b) return a

    return [...a, ...b]
}

export async function generateDenoWorkspace(params: {
    workspaceRoot: string | URL
    workspacePackages?: WorkspacePackage[]
    rootConfig?: JsrConfig
    withDryRun?: boolean
    fixedVersion?: string
}): Promise<string> {
    const {
        workspaceRoot: workspaceRoot_,
        workspacePackages = await collectPackageJsons(workspaceRoot_, true),
        rootConfig,
        withDryRun = false,
        fixedVersion,
    } = params

    const workspaceRoot = normalizeFilePath(workspaceRoot_)

    const rootPackage = findRootPackage(workspacePackages)

    const outDir = join(workspaceRoot, rootConfig?.outputDir ?? 'dist')
    await fsp.rm(outDir, { recursive: true, force: true })
    await fsp.mkdir(outDir, { recursive: true })

    const rootDenoJson = {
        workspace: [] as string[],
    }

    for (const pkg of filterPackageJsonsForPublish(workspacePackages, 'jsr')) {
        if (pkg.json.name == null) continue
        if (rootConfig?.includePackage != null && !rootConfig.includePackage(pkg)) continue

        const packageRoot = pkg.path
        const packageDirName = pkg.json.name.replace(/\//g, '__')
        const packageOutRoot = join(outDir, packageDirName)

        rootDenoJson.workspace.push(`./${packageDirName}`)
        await fsp.mkdir(packageOutRoot, { recursive: true })

        // if we have a custom `build:jsr` script, run it instead of the default package build logic
        if (pkg.json.scripts?.['build:jsr'] != null) {
            await exec([
                'npm',
                'run',
                'build:jsr',
            ], {
                env: {
                    ...process.env,
                    FUMAN_BUILD_SRC: packageRoot,
                    FUMAN_BUILD_OUT: packageOutRoot,
                },
                cwd: packageRoot,
                stdio: 'inherit',
                throwOnError: true,
            })

            continue
        }

        // else proceed with the default build logic

        const packageConfig = await loadBuildConfig<CustomBuildConfigObject>(pkg.path)
        const packageConfigJsr = packageConfig?.jsr

        const srcDir = join(packageRoot, normalizeFilePath(packageConfigJsr?.sourceDir ?? rootConfig?.sourceDir ?? ''))
        const excludeFiles = mergeArrays(rootConfig?.exclude, packageConfigJsr?.exclude)

        // copy source files
        await fsp.cp(srcDir, packageOutRoot, { recursive: true })

        const printer = ts.createPrinter()
        const tsFiles = await glob('**/*.ts', {
            cwd: packageOutRoot,
            ignore: excludeFiles,
        })

        // process source files
        // once @typescript/api-extractor works properly with multiple entrypoints, we could probably
        // use it to optionally rollup everything into a single .ts file
        await asyncPool(tsFiles, async (filename) => {
            const fullFilePath = join(packageOutRoot, filename)

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
                    throw new Error(`Invalid import specifier: ${mod} at ${join(srcDir, filename)}`)
                }
            }

            if (rootConfig?.transformAst?.(file)) {
                changedTs = true
            }
            if (packageConfigJsr?.transformAst?.(file)) {
                changedTs = true
            }

            if (changedTs) {
                fileContent = printer.printFile(file)
                changed = true
            }

            if (rootConfig?.transformCode || packageConfigJsr?.transformCode) {
                const origFileContent = fileContent

                if (rootConfig?.transformCode) {
                    fileContent = rootConfig.transformCode(filename, fileContent)
                }
                if (packageConfigJsr?.transformCode) {
                    fileContent = packageConfigJsr.transformCode(filename, fileContent)
                }

                if (fileContent !== origFileContent) {
                    changed = true
                }
            }

            if (changed) {
                await fsp.writeFile(fullFilePath, fileContent)
            }
        })

        const hookContext: BuildHookContext = {
            outDir: '',
            packageDir: packageOutRoot,
            packageName: pkg.json.name,
            packageJson: pkg.json,
            jsr: true,
        }

        packageConfig?.preparePackageJson?.(hookContext)

        const workspaceVersions = collectVersions(workspacePackages)

        const { packageJson, packageJsonOrig } = processPackageJson({
            packageJson: pkg.json,
            rootPackageJson: rootPackage.json,
            workspaceVersions,
            // since there's no bundling, we can't drop any deps.
            // we *could* copy them from node_modules and add to the import map,
            // but maybe sometime later, doesn't seem like a critical feature
            bundledWorkspaceDeps: [],
            rootFieldsToCopy: ['license'],
        })

        if (fixedVersion != null) {
            packageJson.version = fixedVersion
            packageJsonOrig.version = fixedVersion
        }

        const denoJson = packageJsonToDeno({
            packageJson,
            packageJsonOrig,
            workspaceVersions,
            buildDirName: relative(packageOutRoot, outDir),
            baseDir: relative(packageRoot, srcDir),
            exclude: excludeFiles,
        })

        await fsp.writeFile(join(packageOutRoot, 'deno.json'), JSON.stringify(denoJson, null, 4))

        // copy aux files
        for (const file of mergeArrays(rootConfig?.copyRootFiles, packageConfig?.jsr?.copyRootFiles, ['LICENSE'])) {
            await tryCopy(join(workspaceRoot, file), join(packageOutRoot, file), { recursive: true })
        }
        for (const file of mergeArrays(rootConfig?.copyPackageFiles, packageConfig?.jsr?.copyPackageFiles, ['README.md'])) {
            await tryCopy(join(packageRoot, file), join(packageOutRoot, file), { recursive: true })
        }
    }

    await fsp.writeFile(join(outDir, 'deno.json'), JSON.stringify(rootDenoJson, null, 4))

    if (rootConfig?.dryRun !== false || withDryRun) {
        await exec(['deno', 'publish', '--dry-run', '-q', '--allow-dirty'], {
            cwd: outDir,
            stdio: 'inherit',
            throwOnError: true,
        })
    }

    return outDir
}
