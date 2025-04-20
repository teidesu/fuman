import type { WorkspacePackage } from '../../../package-json/collect-package-jsons.js'

export interface LintConfig {

  /**
   * whether to also validate the root package.json
   *
   * @default false
   */
  includeRoot?: boolean

  /** validation of external dependencies */
  externalDependencies?: {
    /** @default true */
    enabled?: boolean

    /**
     * whether to skip validating peer dependencies
     *
     * @default false
     */
    skipPeerDependencies?: boolean

    shouldSkip?: (ctx: {
      /** package currently being validated */
      package: WorkspacePackage
      /** name of the dependency */
      dependency: string
      /** version of the dependency */
      version: string
      /** field in which the dependency is declared */
      field: 'dependencies' | 'devDependencies' | 'peerDependencies' | 'optionalDependencies'
    }) => boolean
  }
}
