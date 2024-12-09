import process from 'node:process'

import { collectPackageJsons } from '../../package-json/collect-package-jsons.js'

import { bc } from './_utils.js'

/** generate a graphviz dot file of the workspace dependencies */
export async function generateDepsGraph(params: {
    /** path to the workspace root */
    workspaceRoot: string | URL
    /** whether to include the root package.json in the graph */
    includeRoot?: boolean
    /** whether to include external dependencies in the graph */
    includeExternal?: boolean
}): Promise<string> {
    const {
        workspaceRoot,
        includeRoot = false,
        includeExternal = false,
    } = params

    const pjs = await collectPackageJsons(workspaceRoot, includeRoot)
    const workspacePackages = new Set<string>()

    // for workspaces that only include the same prefix, we can omit it
    let commonPrefix: string | undefined
    for (const { json: pj } of pjs) {
        if (pj.name === undefined) continue

        workspacePackages.add(pj.name)

        const [org, name] = pj.name.split('/')
        if (!name) {
            if (commonPrefix !== undefined) {
                commonPrefix = undefined
            }
            break
        }

        if (commonPrefix === undefined) {
            commonPrefix = org
        } else if (commonPrefix !== org) {
            commonPrefix = undefined
            break
        }
    }

    const getName = (name: string) => {
        if (commonPrefix !== undefined) {
            const [org, pkg] = name.split('/')
            if (org === commonPrefix) {
                return pkg
            }
        }

        return name
    }

    const lines = []
    for (const { json: pj } of pjs) {
        if (pj.name === undefined) continue
        const name = getName(pj.name)

        for (const dep of Object.keys(pj.dependencies || {})) {
            if (!workspacePackages.has(dep) && !includeExternal) continue

            const depName = getName(dep)

            lines.push(`"${name}" -> "${depName}"`)
        }

        for (const dep of Object.keys(pj.devDependencies || {})) {
            if (!workspacePackages.has(dep) && !includeExternal) continue

            const depName = getName(dep)

            lines.push(`"${name}" -> "${depName}" [style=dashed,color=grey]`)
        }
    }

    return `digraph {\n${lines.join('\n')}\n}`
}

export const generateDepsGraphCli = bc.command({
    name: 'gen-deps-graph',
    desc: 'generate a graphviz dot file of the workspace dependencies',
    options: {
        includeRoot: bc.boolean('include-root')
            .desc('whether to include the root package.json in the graph'),
        includeExternal: bc.boolean('include-external')
            .desc('whether to include external dependencies in the graph'),
        root: bc.string().desc('path to the root of the workspace (default: cwd)'),
    },
    handler: async (args) => {
        const dot = await generateDepsGraph({
            workspaceRoot: args.root ?? process.cwd(),
            includeRoot: args.includeRoot,
            includeExternal: args.includeExternal,
        })

        console.log(dot)
    },
})
