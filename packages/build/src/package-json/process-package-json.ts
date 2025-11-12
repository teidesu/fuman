import type { PackageJson } from './types.js'

const DEFAULT_FIELDS_TO_COPY_ROOT = ['license', 'author', 'contributors', 'homepage', 'repository', 'bugs']

export function processPackageJson(params: {
  packageJson: PackageJson
  onlyEntrypoints?: boolean
  workspaceVersions?: Record<string, string>
  bundledWorkspaceDeps?: RegExp[]
  rootPackageJson?: PackageJson
  rootFieldsToCopy?: string[]
  fixedVersion?: string
}): {
  packageJson: PackageJson
  packageJsonOrig: PackageJson
  entrypoints: Record<string, string>
} {
  const {
    packageJson: packageJsonOrig,
    onlyEntrypoints = false,
    workspaceVersions,
    rootPackageJson,
    rootFieldsToCopy = DEFAULT_FIELDS_TO_COPY_ROOT,
    bundledWorkspaceDeps,
    fixedVersion,
  } = params
  const packageJson = structuredClone(packageJsonOrig)
  const entrypoints: Record<string, string> = {}

  if (!onlyEntrypoints) {
    // copy common fields from root
    for (const field of rootFieldsToCopy) {
      if (rootPackageJson?.[field] != null && packageJson[field] == null) {
        // eslint-disable-next-line ts/no-unsafe-assignment
        packageJson[field] = rootPackageJson[field]
      }
    }

    const newScripts: Record<string, string> = {}

    if (packageJson.scripts && Array.isArray(packageJson.fuman?.keepScripts)) {
      for (const script of packageJson.fuman.keepScripts) {
        if (typeof script !== 'string') continue
        if (script in packageJson.scripts) continue

        newScripts[script] = packageJson.scripts[script]
      }
      delete packageJson.keepScripts
    }

    packageJson.scripts = newScripts
    delete packageJson.devDependencies
    delete packageJson.private

    if (packageJson.fuman?.distOnlyFields) {
      Object.assign(packageJson, packageJson.fuman.distOnlyFields)
      delete packageJson.distOnlyFields
    }

    function replaceCustomDependencies(field: keyof PackageJson) {
      if (packageJson[field] == null) return

      const dependencies = packageJson[field] as Record<string, string>

      for (const name of Object.keys(dependencies)) {
        const value = dependencies[name]

        if (value.startsWith('workspace:')) {
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

        if (value.startsWith('catalog:')) {
          if (!rootPackageJson?.catalogs) throw new Error('catalogs are not available in the workspace root')
          const catalogName = value.slice('catalog:'.length)
          const catalog = rootPackageJson.catalogs[catalogName]
          if (catalog == null) throw new Error(`catalog ${catalogName} not found in the workspace root`)
          if (catalog[name] == null) throw new Error(`catalog ${catalogName} does not contain ${name}`)

          dependencies[name] = catalog[name]
        }
      }
    }

    replaceCustomDependencies('dependencies')
    replaceCustomDependencies('devDependencies')
    replaceCustomDependencies('peerDependencies')
    replaceCustomDependencies('optionalDependencies')

    // tool-specific fields
    delete packageJson.typedoc
    delete packageJson.eslintConfig
    delete packageJson.eslintIgnore
    delete packageJson.prettier
    delete packageJson.fuman
  }

  if (packageJson.exports != null) {
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

      // .wasm files are copied as-is
      if (value.endsWith('.wasm')) {
        newExports[key] = value
        continue
      }

      let entrypointName = key.replace(/^\.(?:\/|$)/, '').replace(/\.js$/, '')
      if (entrypointName === '') entrypointName = 'index'

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

  if (packageJson.bin != null) {
    const newBin: Record<string, string> = {}
    for (const [key, value] of Object.entries(packageJson.bin as Record<string, string>)) {
      if (typeof value !== 'string') {
        throw new TypeError(`package.json bin value must be a string: ${key}`)
      }

      let entrypointName = key.replace(/^\.(?:\/|$)/, '').replace(/\.js$/, '')
      if (entrypointName === '') entrypointName = 'index'

      entrypoints[entrypointName] = value
      newBin[key] = `${entrypointName}.js`
    }

    packageJson.bin = newBin
  }

  return {
    packageJsonOrig,
    packageJson,
    entrypoints,
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
