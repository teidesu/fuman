import type { PackageJson } from './types.js'

const DEFAULT_FIELDS_TO_COPY_ROOT = ['license', 'author', 'contributors', 'homepage', 'repository', 'bugs']
const DEFAULT_SHOULD_COPY_ENTRYPOINT = (name: string, target: string) => !target.match(/(?<!\.d)\.[mc]?[jt]sx?$/i)
const DEP_FIELDS = ['dependencies', 'peerDependencies', 'optionalDependencies'] as const

function copyRootFields(
  packageJson: PackageJson,
  rootPackageJson: PackageJson | undefined,
  rootFieldsToCopy: string[],
): void {
  for (const field of rootFieldsToCopy) {
    if (rootPackageJson?.[field] != null && packageJson[field] == null) {
      // eslint-disable-next-line ts/no-unsafe-assignment
      packageJson[field] = rootPackageJson[field]
    }
  }
}

function filterKeepScripts(packageJson: PackageJson): void {
  const newScripts: Record<string, string> = {}

  if (packageJson.scripts && Array.isArray(packageJson.fuman?.keepScripts)) {
    for (const script of packageJson.fuman.keepScripts) {
      if (typeof script !== 'string') continue
      if (!(script in packageJson.scripts)) continue

      newScripts[script] = packageJson.scripts[script]
    }
  }

  packageJson.scripts = newScripts
}

function applyDistOnlyFields(packageJson: PackageJson): void {
  delete packageJson.devDependencies
  delete packageJson.private

  if (packageJson.fuman?.distOnlyFields) {
    Object.assign(packageJson, packageJson.fuman.distOnlyFields)
    delete packageJson.distOnlyFields
  }
}

function replaceWorkspaceDependencies(
  packageJson: PackageJson,
  workspaceVersions: Record<string, string> | undefined,
  bundledWorkspaceDeps: RegExp[] | undefined,
  fixedVersion: string | undefined,
): void {
  for (const field of DEP_FIELDS) {
    if (packageJson[field] == null) continue

    const dependencies = packageJson[field] as Record<string, string>

    for (const name of Object.keys(dependencies)) {
      const value = dependencies[name]
      if (!value.startsWith('workspace:')) continue

      if (bundledWorkspaceDeps) {
        let found = false

        for (const dep of bundledWorkspaceDeps) {
          if (dep.test(name)) {
            delete dependencies[name]
            found = true
            break
          }
        }

        if (found) continue
      }

      if (value !== 'workspace:^' && value !== 'workspace:*') {
        throw new Error(
          `Cannot replace workspace dependency ${name} with ${value} - only workspace:^ and * are supported`,
        )
      }
      if (workspaceVersions?.[name] == null) {
        throw new Error(`Cannot replace workspace: dependency ${name} not found in workspace`)
      }

      if (fixedVersion != null) {
        dependencies[name] = fixedVersion
        continue
      }

      const workspaceVersion = workspaceVersions?.[name]
      const depVersion = value === 'workspace:*' ? workspaceVersion : `^${workspaceVersion}`
      dependencies[name] = depVersion
    }
  }
}

function replaceCatalogDependencies(packageJson: PackageJson, rootPackageJson: PackageJson | undefined): void {
  for (const field of DEP_FIELDS) {
    if (packageJson[field] == null) continue

    const dependencies = packageJson[field] as Record<string, string>

    for (const name of Object.keys(dependencies)) {
      const value = dependencies[name]
      if (!value.startsWith('catalog:')) continue

      if (!rootPackageJson?.catalogs) throw new Error('catalogs are not available in the workspace root')
      const catalogName = value.slice('catalog:'.length)
      const catalog = rootPackageJson.catalogs[catalogName]
      if (catalog == null) throw new Error(`catalog ${catalogName} not found in the workspace root`)
      if (catalog[name] == null) throw new Error(`catalog ${catalogName} does not contain ${name}`)

      dependencies[name] = catalog[name]
    }
  }
}

function entrypointNameFromKey(key: string): string {
  let entrypointName = key.replace(/^\.(?:\/|$)/, '').replace(/\.js$/, '')
  if (entrypointName === '') entrypointName = 'index'
  return entrypointName
}

function transformExports(
  packageJson: PackageJson,
  entrypoints: Record<string, string>,
  entrypointsToCopy: Record<string, string>,
  shouldCopyEntrypoint: (name: string, target: string) => boolean,
): void {
  if (packageJson.exports == null) return

  let exports = packageJson.exports as Record<string, string>
  if (typeof exports === 'string') {
    exports = { '.': exports }
  }
  if (typeof exports !== 'object') {
    throw new TypeError('package.json exports must be an object')
  }

  const newExports: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(exports)) {
    if (typeof value !== 'string') {
      throw new TypeError(`package.json exports value must be a string: ${key}`)
    }

    // some files (notably json and wasm) are copied as-is to avoid js shims by vite
    if (shouldCopyEntrypoint(key, value)) {
      newExports[key] = key
      entrypointsToCopy[key] = value
      continue
    }

    const entrypointName = entrypointNameFromKey(key)

    entrypoints[entrypointName] = value
    // NB: at this point, we generate **both** import and require fields,
    // and then remove the `require` field if we're only building for esm
    // (with `removeCommonjsExports`)
    newExports[key] = {
      import: {
        types: `./${entrypointName}.d.ts`,
        default: `./${entrypointName}.js`,
      },
      require: {
        types: `./${entrypointName}.d.cts`,
        default: `./${entrypointName}.cjs`,
      },
    }
  }

  packageJson.exports = newExports
}

function transformBin(packageJson: PackageJson, entrypoints: Record<string, string>): void {
  if (packageJson.bin == null) return

  const newBin: Record<string, string> = {}
  for (const [key, value] of Object.entries(packageJson.bin as Record<string, string>)) {
    if (typeof value !== 'string') {
      throw new TypeError(`package.json bin value must be a string: ${key}`)
    }

    const entrypointName = entrypointNameFromKey(key)
    entrypoints[entrypointName] = value
    newBin[key] = `${entrypointName}.js`
  }

  packageJson.bin = newBin
}

export function processPackageJson(params: {
  packageJson: PackageJson
  onlyEntrypoints?: boolean
  workspaceVersions?: Record<string, string>
  bundledWorkspaceDeps?: RegExp[]
  rootPackageJson?: PackageJson
  rootFieldsToCopy?: string[]
  shouldCopyEntrypoint?: (name: string, target: string) => boolean
  fixedVersion?: string
}): {
  packageJson: PackageJson
  packageJsonOrig: PackageJson
  entrypoints: Record<string, string>
  entrypointsToCopy: Record<string, string>
} {
  const {
    packageJson: packageJsonOrig,
    onlyEntrypoints = false,
    workspaceVersions,
    rootPackageJson,
    rootFieldsToCopy = DEFAULT_FIELDS_TO_COPY_ROOT,
    shouldCopyEntrypoint = DEFAULT_SHOULD_COPY_ENTRYPOINT,
    bundledWorkspaceDeps,
    fixedVersion,
  } = params
  const packageJson = structuredClone(packageJsonOrig)
  const entrypoints: Record<string, string> = {}
  const entrypointsToCopy: Record<string, string> = {}

  if (!onlyEntrypoints) {
    copyRootFields(packageJson, rootPackageJson, rootFieldsToCopy)
    filterKeepScripts(packageJson)
    applyDistOnlyFields(packageJson)
    replaceWorkspaceDependencies(packageJson, workspaceVersions, bundledWorkspaceDeps, fixedVersion)
    replaceCatalogDependencies(packageJson, rootPackageJson)

    // tool-specific fields
    delete packageJson.typedoc
    delete packageJson.eslintConfig
    delete packageJson.eslintIgnore
    delete packageJson.prettier
    delete packageJson.fuman
  }

  transformExports(packageJson, entrypoints, entrypointsToCopy, shouldCopyEntrypoint)
  transformBin(packageJson, entrypoints)

  return {
    packageJsonOrig,
    packageJson,
    entrypoints,
    entrypointsToCopy,
  }
}

/**
 * remove comonjs export definitions from package.json
 *
 * **note**: this function modifies the input object
 */
export function removeCommonjsExports(exports: Record<string, unknown>) {
  const keys = Object.keys(exports)
  if (keys.includes('import')) {
    // implied root: "exports": { "import": "./index.js" }
    delete exports.require
    return
  }

  for (const key of keys) {
    const value = exports[key]
    if (value == null || typeof value !== 'object') continue

    delete (value as Record<string, unknown>).require
  }
}
