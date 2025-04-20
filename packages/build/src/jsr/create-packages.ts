/* eslint-disable no-console */
import type { WorkspacePackage } from '../package-json/collect-package-jsons.js'
import process from 'node:process'
import { collectPackageJsons, filterPackageJsonsForPublish } from '../package-json/collect-package-jsons.js'
import { jsrMaybeCreatePackage, jsrSetGithubRepo } from './utils/jsr-api.js'
import { jsrCheckVersion } from './utils/jsr.js'

export async function jsrCreatePackages(params: {
  workspaceRoot: string
  workspacePackages?: WorkspacePackage[]
  registry?: string
  token?: string
  githubRepo?: string
}) {
  const {
    workspaceRoot,
    registry = process.env.JSR_URL ?? 'https://jsr.io',
    token,
    githubRepo,
  } = params
  const workspace = filterPackageJsonsForPublish(params.workspacePackages ?? await collectPackageJsons(workspaceRoot, false), 'jsr')
  let hasFailed = false

  for (const pkg of workspace) {
    if (pkg.json.name == null) continue

    if (await jsrCheckVersion({ registry, package: pkg.json.name })) {
      // package already exists
      continue
    }

    const [scope_, packageName] = pkg.json.name.split('/')
    const scope = scope_.slice(1)

    if (token == null) {
      console.log(`ℹ️ to create \x1B[;33m${pkg.json.name}\x1B[;0m follow this link: \x1B[;34m${new URL(`/create?scope=${scope}&package=${packageName}`, registry).href}\x1B[;0m`)
      hasFailed = true
      continue
    }

    await jsrMaybeCreatePackage({
      name: pkg.json.name,
      registry,
      token,
    })

    if (githubRepo != null) {
      const [owner, repo] = githubRepo.split('/')
      await jsrSetGithubRepo({
        registry,
        name: pkg.json.name,
        token,
        owner,
        repo,
      })
    }
  }

  return hasFailed
}
