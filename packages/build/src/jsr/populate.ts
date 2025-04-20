/* eslint-disable no-console */
import * as fsp from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'

import { asyncPool, AsyncQueue } from '@fuman/utils'
import ts from 'typescript'

import { exec } from '../misc/exec.js'
import { determinePublishOrder } from '../misc/publish-order.js'

import { parseImportSpecifier } from './utils/external-libs.js'
import { jsrMaybeCreatePackage } from './utils/jsr-api.js'
import { findClosestJsrJson, parseJsrJson } from './utils/jsr-json.js'
import { downloadJsrPackage } from './utils/jsr.js'

async function findPackageDependencies(packagePath: string): Promise<string[]> {
  // jsr.json/deno.json might not contain all dependencies, so we need to find them manually by looking at the source code
  // we shall walk from the exported files, as those are the entry points. jsr packages may have files
  // that are not exported, and we don't want to include those in the dependency list (e.g. tests, examples)
  const jsrJsonPath = findClosestJsrJson(packagePath)
  if (jsrJsonPath == null) {
    throw new Error(`Could not find jsr.json for package at ${packagePath}`)
  }
  const jsrJson = parseJsrJson(await fsp.readFile(jsrJsonPath, 'utf8'))
  const entrypoints = typeof jsrJson.exports === 'string' ? [jsrJson.exports] : Object.values(jsrJson.exports)

  const visited = new Set<string>()
  const dependencies = new Set<string>()

  const queue = [...entrypoints]

  while (queue.length > 0) {
    // eslint-disable-next-line ts/no-non-null-assertion
    const file = queue.shift()!
    if (visited.has(file)) {
      continue
    }
    visited.add(file)

    function handleSpecifier(specifier: string) {
      if (specifier.startsWith('jsr:')) {
        const parsed = parseImportSpecifier(specifier)
        dependencies.add(`${parsed.packageName}@${parsed.version}`)
      } else if (specifier.startsWith('.')) {
        const resolved = resolve(dirname(join(packagePath, file)), specifier)

        let relative = resolved.slice(packagePath.length + 1)
        if (!relative.startsWith('.')) relative = `./${relative}`
        queue.push(relative)
      }
    }

    const content = await fsp.readFile(join(packagePath, file), 'utf8')
    const source = ts.createSourceFile(file, content, ts.ScriptTarget.ESNext, true)

    for (const node of source.statements) {
      if (ts.isImportDeclaration(node)) {
        const specifier = node.moduleSpecifier.getText().slice(1, -1)

        handleSpecifier(specifier)
      } else if (ts.isExportDeclaration(node)) {
        if (node.moduleSpecifier) {
          const specifier = node.moduleSpecifier.getText().slice(1, -1)

          handleSpecifier(specifier)
        }
      }
    }
  }

  return Array.from(dependencies)
}

/**
 * Populate a local JSR instance with packages from an upstream registry
 */
export async function populateFromUpstream(params: {
  /**
   * URL of the upstream registry
   *
   * @default  "https://jsr.io"
   */
  upstream?: string

  /**
   * URL of the downstream local registry
   */
  downstream: string

  /**
   * List of packages to populate (in format: `@scope/name@version`, e.g. `@std/fs@0.105.0`)
   */
  packages: string[]

  /**
   * Optional token for authentication (will be passed as `-t` to `deno publish`). Useful for CI/CD.
   */
  token?: string

  /**
   * Whether to create packages via the API instead of interactively via web UI. Useful for CI/CD.
   *
   * Requires {@link token} to be set.
   */
  createViaApi?: boolean

  /**
   * Deno executable path
   *
   * @default "deno" (from PATH)
   */
  deno?: string

  /**
   * Whether to suppress output
   *
   * @default false
   */
  quiet?: boolean

  /**
   * Additional arguments to pass to `deno publish`
   */
  publishArgs?: string[] | ((pkg: string) => string[])
}): Promise<void> {
  const {
    upstream = 'https://jsr.io',
    downstream,
    packages,
    token,
    createViaApi = false,
    deno = 'deno',
    quiet = false,
    publishArgs: _publishArgs,
  } = params

  const publishArgs = typeof _publishArgs === 'function' ? _publishArgs : () => _publishArgs || []

  if (createViaApi && token == null) {
    throw new Error('createViaApi requires a token')
  }

  // hold a map of dependencies for each package - this will be used to determine the order of publishing
  const depsMap = new Map<string, string[]>()
  const nameToPath = new Map<string, string>()

  // download all packages and their dependencies
  const downloadQueue = new AsyncQueue<string>(packages)

  let i = 0
  let total = downloadQueue.length

  await asyncPool(downloadQueue, async (pkg) => {
    i += 1

    if (nameToPath.has(pkg)) {
      if (downloadQueue.length === 0) {
        downloadQueue.end()
      }

      return
    }

    if (!quiet) {
      console.log(`[${i}/${total}] Downloading ${pkg}...`)
    }

    const specifier = parseImportSpecifier(`jsr:${pkg}`)
    const path = await downloadJsrPackage(specifier, { registry: upstream })
    nameToPath.set(pkg, path)

    const deps = await findPackageDependencies(path)
    depsMap.set(pkg, deps)
    deps.forEach(dep => downloadQueue.enqueue(dep))
    total += deps.length

    if (downloadQueue.length === 0 && deps.length === 0) {
      downloadQueue.end()
    }
  })

  const order = determinePublishOrder(Object.fromEntries(depsMap))

  for (const item of order) {
    const spec = parseImportSpecifier(`jsr:${item}`)
    // eslint-disable-next-line ts/no-non-null-assertion
    const path = nameToPath.get(item)!

    if (createViaApi) {
      await jsrMaybeCreatePackage({
        name: spec.packageName,
        registry: downstream,
        // eslint-disable-next-line ts/no-non-null-assertion
        token: token!,
        quiet,
      })
    }

    if (!quiet) {
      console.log(`Publishing ${item}...`)
    }

    await exec([
      deno,
      'publish',
      '--quiet',
      ...(token != null ? ['--token', token] : []),
      ...publishArgs(item),
    ], {
      env: {
        ...process.env,
        JSR_URL: downstream,
      },
      cwd: path,
      stdio: 'inherit',
      throwOnError: true,
    })
  }
}
