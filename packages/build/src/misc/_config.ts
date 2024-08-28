import { join } from 'node:path'

export async function loadBuildConfig<T>(packageRoot: string, configName = 'build.config.js'): Promise<T | undefined> {
    try {
        // eslint-disable-next-line ts/no-unsafe-assignment, ts/no-unsafe-member-access
        const mod = (await import(join(packageRoot, configName))).default
        if (typeof mod === 'function') {
            // eslint-disable-next-line ts/no-unsafe-call
            return mod() as T
        } else {
            return mod as T
        }
    } catch (e: unknown) {
        if (!(e instanceof Error && (e as unknown as { code: string }).code === 'ERR_MODULE_NOT_FOUND')) {
            throw new Error(`Could not load ${configName}`, { cause: e })
        }
    }
}
