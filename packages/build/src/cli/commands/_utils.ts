import type { RootConfigObject } from '../../config.js'

import * as bc from '@drizzle-team/brocli'
import { loadBuildConfig } from '../../misc/_config.js'

export { bc }

export async function loadConfig(params: {
    workspaceRoot: string
    require?: boolean
}): Promise<RootConfigObject | null> {
    const {
        workspaceRoot,
        require = true,
    } = params

    const config = await loadBuildConfig<RootConfigObject>(workspaceRoot)

    if (!config && require) {
        throw new Error(`Config not found at ${workspaceRoot}`)
    }

    return config ?? null
}
