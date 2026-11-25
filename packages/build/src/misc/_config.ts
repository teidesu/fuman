import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const CONFIG_NAME = 'build.config.js'

function isMissingConfigFile(err: unknown, configHref: string, configPath: string): boolean {
  if (!(err instanceof Error) || !('code' in err) || err.code !== 'ERR_MODULE_NOT_FOUND') {
    return false
  }
  if ('url' in err && err.url === configHref) return true
  const match = err.message.match(/^Cannot find (?:module|package) '([^']+)' imported from /)
  if (!match) return false
  const specifier = match[1]
  return specifier === configHref || specifier === configPath
}

export async function loadBuildConfig<T>(packageRoot: string): Promise<T | undefined> {
  const configPath = join(packageRoot, CONFIG_NAME)
  const configHref = pathToFileURL(configPath).href
  try {
    // eslint-disable-next-line ts/no-unsafe-assignment, ts/no-unsafe-member-access
    const mod = (await import(configHref)).default
    if (typeof mod === 'function') {
      // eslint-disable-next-line ts/no-unsafe-call
      return mod() as T
    } else {
      return mod as T
    }
  } catch (err: unknown) {
    if (isMissingConfigFile(err, configHref, configPath)) {
      return undefined
    }
    throw new Error(`Could not load ${CONFIG_NAME}`, { cause: err })
  }
}
