import process from 'node:process'

import { jsrCreatePackages } from '../../jsr/create-packages.js'
import { generateDenoWorkspace } from '../../jsr/generate-workspace.js'
import { populateFromUpstream } from '../../jsr/populate.js'
import { bc, loadConfig } from './_utils.js'

const populate = bc.command({
    name: 'populate',
    desc: 'populate a local JSR instance with packages from an upstream registry',
    options: {
        upstream: bc.string()
            .desc('URL of the upstream registry (default: process.env.JSR_URL)'),
        createViaApi: bc.boolean('create-via-api')
            .desc('create packages via the API instead of manually via web UI'),
        packages: bc.string()
            .desc('comma-separated list of packages to populate (with version, e.g. `@std/fs@0.105.0`)')
            .required(),
        downstream: bc.string()
            .desc('URL of the downstream local registry')
            .required(),
        token: bc.string()
            .desc('API token'),
        quiet: bc.boolean().alias('q').desc('suppress output'),
        publishArgs: bc.string('publish-args')
            .desc('Additional arguments to pass to `deno publish`'),
    },
    transform: (args) => {
        return {
            ...args,
            packages: args.packages.split(',').map(s => s.trim()),
            publishArgs: args.publishArgs?.split(' '),
        }
    },
    handler: populateFromUpstream,
})

const createPackages = bc.command({
    name: 'create-packages',
    desc: 'create missing packages from the workspace',
    options: {
        registry: bc.string('registry')
            .desc('URL of the registry to publish to')
            .default('https://jsr.io'),
        root: bc.string().desc('path to the root of the workspace (default: cwd)'),
        token: bc.string('token')
            .desc('token to use for managing the packages'),
        githubRepo: bc.string('github-repo')
            .desc('github repo to set for the package (requires --token)'),
    },
    handler: async (args) => {
        const hasFailed = await jsrCreatePackages({
            workspaceRoot: args.root ?? process.cwd(),
            registry: args.registry,
            token: args.token,
            githubRepo: args.githubRepo,
        })

        if (!hasFailed) {
            console.log('✅ \x1B[;32mall packages were published\x1B[;0m')
        }
    },
})

const generateDenoWorkspaceCli = bc.command({
    name: 'gen-deno-workspace',
    options: {
        workspaceRoot: bc.string('root')
            .desc('path to the root of the workspace (default: cwd)'),
        withDryRun: bc.boolean('with-dry-run')
            .desc('whether to run `deno publish --dry-run` after generating the workspace'),
    },
    handler: async (args) => {
        const workspaceRoot = args.workspaceRoot ?? process.cwd()
        const rootConfig = await loadConfig({
            workspaceRoot,
        })

        const outDir = await generateDenoWorkspace({
            workspaceRoot,
            rootConfig: rootConfig?.jsr,
            withDryRun: args.withDryRun,
        })

        console.log(`\x1B[;32mdeno workspace generated at ${outDir}`)
    },
})

export const jsrCli = bc.command({
    name: 'jsr',
    desc: 'jsr-related commands',
    subcommands: [
        populate,
        createPackages,
        generateDenoWorkspaceCli,
    ],
})
