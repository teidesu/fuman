import type { MaybePromise } from '@fuman/utils'

import type { CommitInfo, ConventionalCommit } from '../git/utils.js'

import type { WorkspacePackage } from '../package-json/collect-package-jsons.js'
import type { ProjectChangedFile } from './collect-files.js'

export interface ChangelogGeneratorParams {
  onCommitParseFailed?: (commit: CommitInfo) => void
  onCommitsFetched?: (commits: CommitInfo[]) => Promise<void>
  commitFilter?: (commit: CommitInfo) => boolean
  commitFilterWithFiles?: (commit: CommitInfo, parsed: ConventionalCommit, files: string[]) => boolean
  commitFormatter?: (commit: CommitInfo, parsed: ConventionalCommit, files: string[]) => string
  packageCommitsFormatter?: (packageName: string, commits: Record<string, string>) => string
}

/** settings for versioning manager */
export interface VersioningOptions {
  /**
   * schema to use when tagging commits
   * - `semver`: semver-compatible schema (e.g. `v1.2.3`), based on the max. version of the workspace
   * - `date`: date-based schema (e.g. `v2023.01.01`), based on the date of the release
   *
   * unless your monorepo has standalone packages, you should probably use `semver` schema.
   * `date` schema is primarily useful for repos where different packages have separate release cycles,
   * to avoid conflicts when bumping versions.
   *
   * > note: this is **only** used for the `release` command, when tagging commits.
   * > this does **not** affect the versioning of the packages themselves, they always use semver.
   *
   * @default 'semver'
   */
  taggingSchema?: 'semver' | 'date'

  /**
   * globs of files changes to which to white-list (relative to package root)
   *
   * @default all
   */
  include?: string[] | null
  /**
   * globs of files changes to which to black-list (relative to package root)
   *
   * @default `['**\/*.test.ts', '**\/*.md']`
   */
  exclude?: string[] | null

  /**
   * whether to also bump dependant packages when bumping a package,
   * even if this is a semver-compatible bump.
   *
   * example:
   * - A depends on package B, and B depends on package C
   * - A gets patch bump (e.g. `v1.2.3` -> `v1.2.4`)
   * - when `false` or `'only-minor'`, B and C єlwill not be bumped
   * - when `true`, B and C will be bumped to the same version as A (i.e. `v1.2.4`)
   *
   * `only-minor` will make fuman ignore patch bumps and only bump dependants
   * when minor version is bumped.
   *
   * note that dependants are always bumped on a major bump.
   *
   * @default false
   */
  bumpWithDependants?: boolean | 'only-minor'

  /**
   * custom predicate for inclusion of files
   * (will be called in addition to the globs,
   * defaults to checking if the file is in tsconfig.json)
   */
  shouldInclude?: (file: ProjectChangedFile) => MaybePromise<boolean>

  changelog?: ChangelogGeneratorParams

  /**
   * hook that is called after the versions were bumped and pushed to registries,
   * but before the release commit is created and pushed to git.
   *
   * can be used to add something to the release commit
   */
  beforeReleaseCommit?: (workspace: WorkspacePackage[]) => MaybePromise<void>
}
