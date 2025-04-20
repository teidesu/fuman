import type { PackageJson } from '../package-json/types.js'
import { asNonNull } from '@fuman/utils'

export interface DenoJson {
  name: string
  version: string
  exports?: Record<string, string>
  imports?: Record<string, string>
  exclude?: string[]
  publish?: {
    exclude?: string[]
  }
}

export function packageJsonToDeno({
  packageJson,
  packageJsonOrig,
  workspaceVersions,
  exclude,
  buildDirName,
  baseDir,
}: {
  packageJson: PackageJson
  packageJsonOrig: PackageJson
  workspaceVersions: Record<string, string>
  buildDirName: string
  baseDir?: string
  exclude?: string[]
}): DenoJson {
  // https://jsr.io/docs/package-configuration

  const importMap: Record<string, string> = {}
  const exports: Record<string, string> = {}

  for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
    const deps = packageJson[field] as Record<string, string>
    if (deps == null) continue

    for (const [name, version] of Object.entries(deps)) {
      if (typeof version !== 'string') continue

      if (name in workspaceVersions) {
        continue // will be handled by the workspace
      } else if (version.startsWith('npm:@jsr/')) {
        const jsrName = version.slice(9).split('@')[0].replace('__', '/')
        const jsrVersion = version.slice(9).split('@')[1]
        importMap[name] = `jsr:@${jsrName}@${jsrVersion}`
      } else if (name) {
        let packageName = name
        let packageVersion = version

        if (version.startsWith('npm:')) {
          const idx = packageName.indexOf('@')
          if (idx === -1) {
            throw new Error(`Invalid npm dependency: ${name}`)
          }

          packageVersion = packageName.slice(idx + 1)
          packageName = packageName.slice(4, idx)
        } else if (version.match(/\|\||&&|:/)) {
          throw new Error(`Invalid npm dependency (not supported by JSR): ${name}@${version}`)
        }

        importMap[name] = `npm:${packageName}@${packageVersion}`
      }
    }
  }

  if (packageJsonOrig.exports != null) {
    let tmpExports
    if (typeof packageJsonOrig.exports === 'string') {
      tmpExports = { '.': packageJsonOrig.exports }
    } else if (typeof packageJsonOrig.exports !== 'object') {
      throw new TypeError('package.json exports must be an object')
    } else {
      tmpExports = packageJsonOrig.exports as Record<string, string>
    }

    for (const [name, value] of Object.entries(tmpExports)) {
      if (typeof value !== 'string') {
        throw new TypeError(`package.json exports value must be a string: ${name}`)
      }
      if (value.endsWith('.wasm')) continue

      if (baseDir != null && baseDir !== '.') {
        if (!value.startsWith(`./${baseDir}`)) {
          throw new Error(`Invalid export value: ${value} (must be inside ./${baseDir})`)
        }
        exports[name] = `./${value.slice(baseDir.length + 3)}`
      } else {
        exports[name] = value
      }
    }
  }

  return {
    name: asNonNull(packageJson.name),
    version: asNonNull(packageJson.version),
    exports,
    exclude,
    imports: importMap,
    publish: {
      // in the probable case we have `dist` in .gitignore, deno will ignore it by default
      // but since the dist in our case is the generated JSR package, we do want to include it
      exclude: [`!../${buildDirName}`],
    },
    ...(packageJson.denoJson != null && typeof packageJson.denoJson === 'object' ? packageJson.denoJson as Record<string, unknown> : {}),
  }
}
