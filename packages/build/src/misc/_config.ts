import { join } from 'node:path'

const CONFIG_NAME = 'build.config.js'

export async function loadBuildConfig<T>(packageRoot: string): Promise<T | undefined> {
  try {
    // eslint-disable-next-line ts/no-unsafe-assignment, ts/no-unsafe-member-access
    const mod = (await import(join(packageRoot, CONFIG_NAME))).default
    if (typeof mod === 'function') {
      // eslint-disable-next-line ts/no-unsafe-call
      return mod() as T
    } else {
      return mod as T
    }
  } catch (e: unknown) {
    if (!(e instanceof Error && (e as unknown as { code: string }).code === 'ERR_MODULE_NOT_FOUND')) {
      throw new Error(`Could not load ${CONFIG_NAME}`, { cause: e })
    }
  }
}
