## @fuman/build

this package contains utilities for building packages and managing monorepos.

existing similar tools try to do too much and accomodate for every possible use case,
which makes them quite hard to use and don't provide enough consistency.
unlike them, this package is *very* opinionated and is probably not for you.

this package works on some assumptions, allowing to abstract some of the complexity away:
 - for workspaces, it assumes that the workspace is managed with pnpm
   - packages within the workspace are linked using [`workspace:` protocol](https://pnpm.io/workspaces#workspace-protocol-workspace)
 - all packages must be `type: module`
 - `.exports` and `.bin` fields in package.json are build entrypoints, e.g.:
   ```json
   {
       "exports": {
           ".": "./src/index.ts"
       },
       "bin": {
           "fuman-build": "./src/cli.ts"
       }
   }
   ```
 - `.main`, `.module`, `.types`, `.browser` are explicitly **not** supported. for browser-specific code, you should make a secondary entrypoint/package instead of relying on bundle-time magic
 - package versioning is continous and semver-compliant
 - this package currently focuses on non-frontend libraries

it *might* work with other setups, but that is not supported.

## package.json pre-processing features

...provided by `processPackageJson` function
 - copying common fields from root package.json
 - replacing `workspace:` dependencies with the actual version from the workspace
 - removing `scripts` (except ones listed in `keepScripts`)
 - removing `devDependencies`
 - collecting entrypoints from `exports` and `bin`

## usage with vite

just put this in your `vite.config.js`:
```ts
import { fumanBuild } from '@fuman/build/vite'

export default {
    plugins: [
        fumanBuild({
            root: __dirname,
            // if you're using `vite-plugin-dts`, make sure to add this option,
            // otherwise additional entrypoints will not have proper types
            // (and DO NOT add this option to the dts plugin itself)
            insertTypesEntry: true,
        }),
    ],
}
```

## usage with jsr

fuman-build also supports jsr by being able to convert a pnpm workspace into a deno workspace,
which can then be published via simple `deno publish` command.

to generate a deno workspace, run `fuman-build jsr gen-deno-workspace`.

## cli

fuman-build has a pretty cool cli, check it out via `fuman-build --help`

## ci/cd

fuman-build also makes it *very* easy to use in CI/CD pipelines.
a very simple release flow powered by fuman build and github actions
can be found [here](https://github.com/teidesu/fuman/blob/main/.github/workflows/release.yaml).

the `release` command basically combines a bunch of other commands
(namely, `bump-version`, `gen-changelog`, `publish` and `jsr` subcommands)
into one and adds some additional release-specific features (like git tagging and github release generation), and is the recommended way to use fuman-build in CI/CD pipelines.

though it is definitely possible to use the other commands directly, in case
you need to do something that is not supported out of the box.
