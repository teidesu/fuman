import type { RootConfigObject } from '../../config.js'

import * as bc from '@drizzle-team/brocli'
import { loadBuildConfig } from '../../misc/_config.js'

export { bc }

export async function loadConfig(params: {
    workspaceRoot: string
    configPath?: string
    require?: boolean
}): Promise<RootConfigObject | null> {
    const {
        workspaceRoot,
        configPath = 'build.config.js',
        require = true,
    } = params

    const config = await loadBuildConfig<RootConfigObject>(workspaceRoot, configPath)

    if (!config && require) {
        throw new Error(`Config not found: ${configPath}`)
    }

    return config ?? null
}
