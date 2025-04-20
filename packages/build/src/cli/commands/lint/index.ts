import type { InternalDepsError } from './validate-workspace-deps.js'
import process from 'node:process'
import { bc, loadConfig } from '../_utils.js'
import { validateWorkspaceDeps } from './validate-workspace-deps.js'

const INTERNAL_MESSAGES: Record<InternalDepsError['subtype'], string> = {
  not_workspace_proto: 'internal dependencies must be linked with workspace: protocol',
  standalone_dep: 'non-standalone packages cannot depend on standalone packages with workspace: protocol',
  not_workspace_dep: 'workspace: protocol is used to link to a package not found in the workspace',
}

export const lintCli = bc.command({
  name: 'lint',
  desc: 'check the workspace for any issues',
  options: {
    workspace: bc.string().desc('path to the workspace root (default: cwd)'),
    noErrorCode: bc.boolean('no-error-code')
      .desc('whether to always exit with a zero code')
      .default(false),
  },
  handler: async (args) => {
    const workspaceRoot = args.workspace ?? process.cwd()

    const config = (await loadConfig({ workspaceRoot }))?.lint
    const errors = await validateWorkspaceDeps({
      workspaceRoot,
      config,
    })

    if (errors.length > 0) {
      const externalErrors = errors.filter(it => it.type === 'external')
      const internalErrors = errors.filter(it => it.type === 'internal')

      if (externalErrors.length > 0) {
        console.error('⚠️ Found external dependencies mismatch:')
        for (const error of externalErrors) {
          console.error(`  - at ${error.package}: ${error.at} has ${error.dependency}@${error.version}, but ${error.otherPackage} has @${error.otherVersion}`)
        }
      }

      if (internalErrors.length > 0) {
        console.error('⚠️ Found issues with internal dependencies:')
        for (const error of internalErrors) {
          console.error(`  - at ${error.package}, dependency ${error.dependency}: ${INTERNAL_MESSAGES[error.subtype]}`)
        }
      }

      if (!args.noErrorCode) {
        process.exit(1)
      }
    }
  },
})
