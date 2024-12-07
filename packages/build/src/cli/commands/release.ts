import type { WorkspacePackage } from '../../package-json/collect-package-jsons.js'
import type { BumpVersionResult } from '../../versioning/bump-version.js'
import { createReadStream } from 'node:fs'
import { basename } from 'node:path'
import process from 'node:process'
import { nodeReadableToWeb } from '@fuman/node'
import { asNonNull, notImplemented } from '@fuman/utils'
import { sort } from 'semver'
import { createGithubRelease } from '../../git/github.js'
import { getFirstCommit, getLatestTag } from '../../git/utils.js'
import { jsrCreatePackages } from '../../jsr/create-packages.js'
import { generateDenoWorkspace } from '../../jsr/generate-workspace.js'
import { exec } from '../../misc/exec.js'
import { collectPackageJsons } from '../../package-json/collect-package-jsons.js'
import { bumpVersion } from '../../versioning/bump-version.js'
import { generateChangelog } from '../../versioning/generate-changelog.js'
import { bc, loadConfig } from './_utils.js'
import { formatBumpVersionResult } from './bump-version.js'
import { publishPackages } from './publish.js'

export const releaseCli = bc.command({
    name: 'release',
    desc: 'release packages',
    options: {
        kind: bc.string('kind')
            .desc('release kind')
            .enum('major', 'minor', 'patch', 'auto')
            .default('auto'),

        withGithubRelease: bc.boolean('with-github-release')
            .desc('whether to create a github release (requires GITHUB_TOKEN env var). if false, will only create a commit with the release notes')
            .default(false),
        githubToken: bc.string('github-token')
            .desc('github token to use for creating a release (defaults to GITHUB_TOKEN env var)'),
        githubRepo: bc.string('github-repo')
            .desc('github repo to create a release for (defaults to GITHUB_REPOSITORY env var)'),

        withJsr: bc.boolean('with-jsr')
            .desc('whether to publish to jsr')
            .default(false),
        jsrRegistry: bc.string('jsr-registry')
            .desc('URL of the jsr registry to publish to'),
        jsrToken: bc.string('jsr-token')
            .desc('jsr token to use for publishing'),
        jsrPublishArgs: bc.string('jsr-publish-args')
            .desc('additional arguments to pass to `deno publish`'),
        jsrCreatePackages: bc.boolean('jsr-create-packages')
            .desc('whether to create missing packages in jsr'),

        withNpm: bc.boolean('with-npm')
            .desc('whether to publish to npm'),
        npmToken: bc.string('npm-token')
            .desc('npm token to use for publishing (note: this will override the global .npmrc file)'),
        npmPublishArgs: bc.string('npm-publish-args')
            .desc('additional arguments to pass to `npm publish`'),
        npmDistDir: bc.string('npm-dist-dir')
            .desc('directory to publish to npm from, relative to package root (default: dist)'),
        npmRegistry: bc.string('npm-registry')
            .desc('URL of the npm registry to publish to'),

        dryRun: bc.boolean('dry-run')
            .desc('whether to skip publishing and only print what is going to happen'),
    },
    handler: async (args) => {
        const root = process.cwd()
        const config = await loadConfig({
            workspaceRoot: root,
            configPath: 'build.config.js',
            require: false,
        })
        const workspaceWithRoot = await collectPackageJsons(root, true)
        const workspace = workspaceWithRoot.filter(pkg => !pkg.root)

        const prevTag = await getLatestTag(root)
        if (prevTag == null) {
            console.log('🤔 no previous tag found, assuming this is a first ever release')
        } else {
            console.log(`📌 previous tag: ${prevTag}`)
        }

        let changedPackages: WorkspacePackage[]
        let bumpVersionResult: BumpVersionResult | undefined
        if (prevTag != null) {
            bumpVersionResult = await bumpVersion({
                workspace,
                since: prevTag ?? await getFirstCommit(root),
                type: args.kind === 'auto' ? undefined : args.kind,
                cwd: root,
                params: config?.versioning,
                dryRun: args.dryRun,
            })

            changedPackages = bumpVersionResult.changedPackages.map(pkg => pkg.package)

            if (changedPackages.length === 0) {
                console.log('🤔 no packages changed, nothing to do')
                process.exit(1)
            }

            console.log(formatBumpVersionResult(bumpVersionResult, args.kind === 'auto'))

            for (const pkg of changedPackages) {
                const inWorkspace = asNonNull(workspace.find(it => it.json.name === pkg.json.name))

                inWorkspace.json.version = pkg.json.version
            }
        } else {
            changedPackages = workspace
        }

        console.log('')
        console.log('📝 generating changelog...')

        const changelog = prevTag != null
            ? await generateChangelog({
                workspace: changedPackages,
                cwd: root,
                since: prevTag,
                params: config?.versioning,
            })
            : 'Initial release'

        if (args.dryRun) {
            console.log('--begin changelog--')
            console.log(changelog)
            console.log('--end changelog--')
        }

        let tarballs: string[] = []

        if (args.withNpm) {
            console.log('')
            console.log('📤 publishing to npm...')

            const publishResult = await publishPackages({
                packages: changedPackages.map(pkg => asNonNull(pkg.json.name)),
                workspace: workspaceWithRoot,
                workspaceRoot: root,
                registryUrl: args.npmRegistry,
                token: args.npmToken,
                distDir: args.npmDistDir,
                publishArgs: args.npmPublishArgs?.split(' '),
                dryRun: args.dryRun,
                withBuild: true,
                withTarballs: args.withGithubRelease,
            })

            if (publishResult.failed.length > 0) {
                console.log('❌ failed to publish:')
                for (const pkg of publishResult.failed) {
                    console.log(`  ${pkg}`)
                }

                process.exit(1)
            }

            console.log('\x1B[;32m✅ published to npm\x1B[;0m')

            tarballs = publishResult.tarballs
        } else if (args.withGithubRelease) {
            // todo: we are definitely able to generate tarballs without publishing to npm,
            // but im just too lazy to implement it right now, and there's no need for it for me
            notImplemented('Cannot create a github release without publishing to npm (yet)')
        }

        if (args.withJsr) {
            if (args.jsrCreatePackages) {
                console.log('')
                console.log('🔄 creating missing packages in jsr...')

                const hasMissing = await jsrCreatePackages({
                    workspaceRoot: root,
                    workspacePackages: workspaceWithRoot,
                    registry: args.jsrRegistry,
                    token: args.jsrToken,
                    githubRepo: args.githubRepo,
                })

                if (hasMissing) {
                    console.log('\x1B[;31m  ❌ some packages are missing, this might cause issues\x1B[;0m')
                }
            }

            console.log('')
            console.log('🔄 generating deno workspace...')

            const workspaceDir = await generateDenoWorkspace({
                workspaceRoot: root,
                workspacePackages: workspaceWithRoot,
                rootConfig: config?.jsr,
            })

            console.log('')
            console.log('📤 publishing to jsr...')

            await exec([
                'deno',
                'publish',
                '--quiet',
                '--allow-dirty',
                ...(args.dryRun ? ['--dry-run'] : []),
                ...(args.jsrPublishArgs?.split(' ') ?? []),
            ], {
                env: {
                    ...process.env,
                    JSR_URL: args.jsrRegistry,
                },
                cwd: workspaceDir,
                stdio: 'inherit',
                throwOnError: true,
            })

            console.log('\x1B[;32m✅ published to jsr\x1B[;0m')
        }

        let tagName: string
        if (!bumpVersionResult) {
            // if this is a first release, use the max version as the tag name,
            // because the bump did not happen
            const versions = sort(workspace.map(pkg => asNonNull(pkg.json.version)))
            tagName = `v${versions[versions.length - 1]}`
        } else {
            tagName = `v${bumpVersionResult.nextVersion}`
        }

        if (args.dryRun) {
            console.log('dry run, skipping release commit and tag')
        } else {
            let message = `chore(release): ${tagName}`
            if (!args.withGithubRelease) {
                message += `\n\n${changelog}`
            }

            await exec(['git', 'commit', '-am', message, '--allow-empty'], {
                cwd: root,
                stdio: 'inherit',
                throwOnError: true,
            })

            await exec(['git', 'tag', tagName], {
                cwd: root,
                stdio: 'inherit',
                throwOnError: true,
            })
        }

        if (args.withGithubRelease) {
            if (args.dryRun) {
                console.log('dry run, skipping github release')
            } else {
                const token = args.githubToken ?? process.env.GITHUB_TOKEN
                if (token == null) {
                    throw new Error('github token is not set')
                }

                const repo = args.githubRepo ?? process.env.GITHUB_REPOSITORY
                if (repo == null) {
                    throw new Error('github repo is not set')
                }

                console.log('')
                console.log('🐙 creating github release...')

                await createGithubRelease({
                    token,
                    repo,
                    tag: tagName,
                    name: tagName,
                    body: changelog,
                    artifacts: tarballs.map(file => ({
                        name: basename(file),
                        type: 'application/gzip',
                        body: nodeReadableToWeb(createReadStream(file)),
                    })),
                })

                console.log(`\x1B[;32m✅github release created: https://github.com/${repo}/releases/tag/${tagName}\x1B[;0m`)
            }
        }

        if (!args.dryRun) {
            await exec(['git', 'push', '--follow-tags'], {
                cwd: root,
                stdio: 'inherit',
                throwOnError: true,
            })
        }

        console.log('')
        console.log('🎉 done!')
    },
})
