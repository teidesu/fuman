## @fuman/build

this package contains utilities for building packages and managing monorepos.

existing similar tools try to do too much and accomodate for every possible use case,
which makes them quite hard to use and don't provide enough consistency.
unlike them, this package is *very* opinionated and might not be for you.

this package works on some assumptions, allowing to abstract some of the complexity away:
 - for workspaces, it assumes that the workspace is managed with pnpm
   - packages within the workspace are linked using [`workspace:` protocol](https://pnpm.io/workspaces#workspace-protocol-workspace),
     and versions are replaced with the actual version at build time
 - packages are built using vite (i.e. rollup). i might support some other bundler down the line, though
   - tsc is explicitly **not** supported, because using `tsc` to build is such a pain that it's just not worth it.
 - all packages must be `type: module`, because commonjs sucks (you can still build into commonjs, tho)
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
 - `.main`, `.module`, `.types`, `.browser` are explicitly **not** supported. for browser-specific code, you should make a secondary entrypoint/package instead of relying on bundle-time magic
 - package versioning is continous and semver-compliant (except "fixed version" releases, which all share the same version)
 - this package currently focuses on non-frontend libraries

it *might* work with other setups, but that is not supported.

### why exactly?

because node sucks. `package.json` is an absolute mess – it's not standardized properly, and it's a pain to work with.
when it was invented, typescript wasn't even a thing, and as such it's a pain to set it up correctly for libraries.
and npm is also a pain due to similar reasons. everything is so fragile and inconsistent that it's very easy to make mistakes.

deno and jsr fix some of the issues, but i just generally don't like deno because it feels very limiting and vendor-locking,
and there isn't any tool to write cross-runtime code under deno anyway.

additionally there's quite some pain writing release ci/cd flows for libraries.
especially for monorepos, especially when you want to cross-publish to npm and jsr.

### package.json pre-processing features

...provided by `processPackageJson` function
 - copying common fields from root package.json
 - replacing `workspace:` dependencies with the actual version from the workspace
 - removing `scripts` (except ones listed in `keepScripts`)
 - removing `devDependencies`, `typedoc`/`prettier`/etc
 - collecting entrypoints from `exports` and `bin`
 - running hooks declared in `build.config.js` files

this allows to:
 - simplify the inner package.jsons and keep them in sync with the root package.json
 - simplify the release flow by not having to manually update dependency versions in each package
   - (i know that pnpm/yarn basically fix this with `workspace:` protocol, but i don't like the idea of using something other than npm cli to publish to npm)
 - ensures you don't accidentally publish unwanted `prepare`/`install`/etc. scripts to npm (and also reduces install size by a bit)
 - reduces install size a bit
 - improve dx by *a lot*
   - you no longer need to build the packages before you can import them, nor do you need to repeat yourself by manually providing `.types` field for development
   - you no longer need to sync vite build entrypoints with `package.json` across all packages (and accidentally publish them broken)
 - since we generate a new package.json, you can do pretty much any modifications to the production package.json
   (despite the above, there might still be cases that we don't cover and you want a bit more control.
   feel free to open an issue if you feel like this should be in the package tho!)

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
