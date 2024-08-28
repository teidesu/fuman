import type { MaybePromise } from '@fuman/utils'

import type { CommitInfo, ConventionalCommit } from '../git/utils.js'

import type { ProjectChangedFile } from './collect-files.js'

export interface ChangelogGeneratorParams {
    onCommitParseFailed?: (commit: CommitInfo) => void
    onCommitsFetched?: (commits: CommitInfo[]) => Promise<void>
    commitFilter?: (commit: CommitInfo) => boolean
    commitFilterWithFiles?: (commit: CommitInfo, parsed: ConventionalCommit, files: string[]) => boolean
    commitFormatter?: (commit: CommitInfo, parsed: ConventionalCommit, files: string[]) => string
    packageCommitsFormatter?: (packageName: string, commits: Record<string, string>) => string
}

export interface VersioningOptions {
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
     * custom predicate for inclusion of files
     * (will be called in addition to the globs,
     * defaults to checking if the file is in tsconfig.json)
     */
    shouldInclude?: (file: ProjectChangedFile) => MaybePromise<boolean>

    changelog?: ChangelogGeneratorParams
}
